"use strict";

var EPSILON = 1e-6;
var numeric = require("numeric");
var bits = require("bit-twiddle");

function BoundaryPoint(coord, cells) {
  this.coord = coord;
  this.cells = cells;
}

function Grid(cells, positions, tolerance, grid) {
  this.cells = cells;
  this.positions = positions;
  this.tolerance = tolerance;
  this.grid = grid;
}

function index(x) {
  switch(x.length) {
    case 0:
      return 0;
    case 1:
      return x[0];
    case 2:
      return bits.interleave2(x[0], x[1]);
    case 3:
      return bits.interleave3(x[0], x[1], x[2]);
    default:
      return x.join("|");
  };
}

//Computes distance from x to cell c using quadratic programming.
//This works in n-dimensions, but could probably be optimized using the GJK algorithm
function cellDistance(c, positions, x) {
  var D = numeric.rep([c.length, c.length], 0.0);
  var dvec = numeric.rep([c.length], 0.0);
  for(var i=0; i<c.length; ++i) {
    var pi = positions[c[i]];
    dvec[i] = numeric.dot(pi, x);
    for(var j=0; j<c.length; ++j) {
      var pj = positions[c[j]];
      D[i][j] = D[j][i] = numeric.dot(pi, pj);
    }
  }
  var A = numeric.rep([c.length, c.length+2], 0.0);
  var b = numeric.rep([c.length+2], 0.0);
  b[0] = 1.0-EPSILON;
  b[1] = -(1.0+EPSILON);
  for(var i=0; i<c.length; ++i) {
    A[i][0]   = 1;
    A[i][1]   = -1
    A[i][i+2] = 1;
  }
  return numeric.solveQP(D, dvec, A, b);
}


BoundaryPoint.prototype.closestCells = function(grid, x) {
  var nbhd = this.cells;
  var d = Number.POSITIVE_INFINITY;
  var r = [];
  for(var i=0; i<nbhd.length; ++i) {
    var c = nbhd[i];
    var t = cellDistance(grid.cells[c], grid.positions, x);
    if(t.message.length > 0 || isNaN(t.value[0])) {
      continue;
    }
    t.cell = c;
    if(Math.abs(t.value[0] - d) < EPSILON) {
      r.push(t);
    } else if(t.value[0] < d) {
      d = t.value;
      r = [ t ];
    }
  }
  var cells = [];
  var points = [];
  for(var k=0; k<r.length; ++k) {
    var point = numeric.rep([x.length], 0.0);
    var cell = grid.cells[r[k].cell];
    var solution = r[k].solution;
    for(var i=0; i<cell.length; ++i) {
      var p = grid.positions[cell[i]];
      var w = solution[i];
      for(var j=0; j<x.length; ++j) {
        point[j] += p[j] * w;
      }
    }
    cells.push(r[k].cell);
    points.push(point);
  }
  return {
    points: points,
    cells: cells,
    distance: Math.sqrt(2.0*r[0].value[0] + numeric.dot(x,x))
  };
}

BoundaryPoint.prototype.neighborhood = function(grid, x, radius) {
  var nbhd = this.cells;
  var r = [];
  var r2 = radius*radius - numeric.dot(x,x);
  for(var i=0; i<nbhd.length; ++i) {
    var c = nbhd[i];
    var t = cellDistance(grid.cells[c], grid.positions, x);
    if(t.message.length > 0 || isNaN(t.value[0])) {
      continue;
    }
    if(t.value[0] <= r2) {
      r.push(c);
    }
  }
  return r;
}


//Locates the closest cell within tolerance to x
Grid.prototype.closestCells = function(x) {
  var tolerance = this.tolerance;
  var ix = new Array(x.length);
  for(var i=0; i<x.length; ++i) {
    ix[i] = Math.floor(x[i] / tolerance);
  }
  var nbhd = this.grid[index(ix)];
  if(!nbhd) {
    return null;
  }
  return nbhd.closestCells(this, x);
}


//Locates the closest cell within tolerance to x
Grid.prototype.neighborhood = function(x, radius) {
  var tolerance = this.tolerance;
  var ix = new Array(x.length);
  for(var i=0; i<x.length; ++i) {
    ix[i] = Math.floor(x[i] / tolerance);
  }
  var nbhd = this.grid[index(ix)];
  if(!nbhd) {
    return [];
  }
  return nbhd.neighborhood(this, x, radius);
}



//Optimized stuff to fill in grid
function fill1(grid, lo, hi, c) {
  for(var i=lo[0]; i<=hi[0]; ++i) {
    if(grid[i]) {
      grid[i].cells.push(c);
    } else {
      grid[i] = new BoundaryPoint([i], [c]);
    }
  }
}

function expand2(x) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  return x;
}

function fill2(grid, lo, hi, c) {
  var scoord = [0,0];
  var tol = 2 * grid.tolerance * grid.tolerance;
  for(var i=lo[1]; i<=hi[1]; ++i) {
    var x = expand2(i)<<1;
    scoord[1] = i * grid.tolerance;
    for(var j=lo[0]; j<=hi[0]; ++j) {
      scoord[0] = y * grid.tolerance;
      var cdist = cellDistance(grid.cells[c], grid.positions, scoord);
      if(cdist.message.length > 0 ||
         isNaN(cdist.value[0]) ||
          (numeric.dot(scoord, scoord) + 2.0 * cdist.value[0]) >= tol) {
          continue;
      }
      var y = x + expand2(j);
      var g = grid.grid[y];
      if(g) {
        g.cells.push(c);
      } else {
        grid.grid[y] = new BoundaryPoint([j,i], [c]);
      }
    }
  }
}

function expand3(x) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;
  return x;
}

function fill3(grid, lo, hi, c) {
  var scoord = [0,0,0];
  var tol = 3.0 * grid.tolerance * grid.tolerance;
  for(var i=lo[2]; i<=hi[2]; ++i) {
    var x = expand3(i)<<2;
    scoord[2] = grid.tolerance * i;
    for(var j=lo[1]; j<=hi[1]; ++j) {
      var y = x + (expand3(j) << 1);
      scoord[1] = grid.tolerance * j;
      for(var k=lo[0]; k<=hi[0]; ++k) {
        scoord[0] = grid.tolerance * k;
        var cdist = cellDistance(grid.cells[c], grid.positions, scoord);
        if( cdist.message.length > 0 ||
            isNaN(cdist.value[0]) ||
            (numeric.dot(scoord, scoord) + 2.0 * cdist.value[0]) >= tol) {
            continue;
        }      
        var z = y + expand3(k);
        var g = grid.grid[z];
        if(g) {
          g.cells.push(c);
        } else {
          grid.grid[z] = new BoundaryPoint([k,j,i], [c]);;
        }
      }
    }
  }
}

function fill_rec(grid, lo, hi, c, n, coord) {
  if(n < 0) {
    var scoord = numeric.mul(grid.tolerance, coord);
    var cdist = cellDistance(grid.cells[c], grid.positions, scoord);
    if(cdist.message.length > 0 ||
       isNaN(cdist.value[0]) ||
        (numeric.dot(scoord, scoord) + 2.0 * cdist.value[0]) >= (lo.length * grid.tolerance *grid.tolerance) ) {
        return;
    }
    var k = index(coord);
    var bnd = grid.grid[k];
    if(bnd) {
      bnd.cells.push(c);
    } else {
      grid.grid[k] = new BoundaryPoint(coord.slice(0), [c])
    }
  } else {
    for(coord[n]=lo[n]; coord[n]<=hi[n]; ++coord[n]) {
      fill_rec(grid, lo, hi, c, n-1, coord);
    }
  }
}

function fill(grid, lo, hi, c) {
  var n = lo.length;
  switch(n) {
    case 0:
      //Do nothing
    break;
    case 1:
      fill1(grid, lo, hi, c);
    break;
    case 2:
      fill2(grid, lo, hi, c);
    break;
    case 3:
      fill3(grid, lo, hi, c);
    break;
    default:
      fill_rec(grid, lo, hi, c, n-1, new Array(n));
    break;
  }
}

function createGrid(mesh, tolerance) {
  var cells = mesh.cells || mesh.faces;
  var positions = mesh.positions;
  var grid = {};  
  var result = new Grid(cells, positions, tolerance, grid);
  var d = positions[0].length;
  var lo = new Array(d);
  var ilo = new Array(d);
  var hi = new Array(d);
  var ihi = new Array(d);
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i];
    for(var j=0; j<d; ++j) {
      lo[j] = Number.POSITIVE_INFINITY;
      hi[j] = Number.NEGATIVE_INFINITY;
    }
    for(var k=0; k<c.length; ++k) {
      var p = positions[c[k]];
      for(var j=0; j<d; ++j) {
        lo[j] = Math.min(lo[j], p[j]);
        hi[j] = Math.max(hi[j], p[j]);
      }
    }
    for(var j=0; j<d; ++j) {
      ilo[j] = Math.floor(lo[j] / tolerance) - 1;
      ihi[j] = Math.ceil(hi[j] / tolerance) + 1;
    }
    fill(result, ilo, ihi, i);
  }
  return result;
}
module.exports = createGrid;