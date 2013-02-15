"use strict";

var EPSILON = 1e-6;
var numeric = require("numeric");
var bits = require("bit-twiddle");
var closestPoint = require("polytope-closest-point");

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

BoundaryPoint.prototype.closestCells = function(grid, x) {
  var nbhd = this.cells;
  var d = Number.POSITIVE_INFINITY;
  var r_cells = [];
  var r_points = [];
  var point_result = new Array(x.length);
  for(var i=0; i<nbhd.length; ++i) {
    var c = nbhd[i];
    var t = closestPoint(grid.cells[c], grid.positions, x, point_result);
    if(Math.abs(t - d) < EPSILON) {
      r_cells.push(c);
      r_points.push(point_result.slice(0));
    } else if(t < d) {
      d = t;
      r_cells.length = 1;
      r_cells[0] = c;
      r_points.length = 1;
      r_points[0] = point_result.slice(0);
    }
  }
  return {
    points: r_points,
    cells: r_cells,
    distance: d
  };
}

BoundaryPoint.prototype.neighborhood = function(grid, x, radius) {
  var nbhd = this.cells;
  var r = [];
  var r2 = radius*radius;
  for(var i=0; i<nbhd.length; ++i) {
    var c = nbhd[i];
    if(closestPoint(grid.cells[c], grid.positions, x) <= r2) {
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
      var cdist = closestPoint(grid.cells[c], grid.positions, scoord);
      if(isNaN(cdist) || cdist >= tol) {
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
        var cdist = closestPoint(grid.cells[c], grid.positions, scoord);
        if( isNaN(cdist) || cdist >= tol) {
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
    var cdist = closestPoint(grid.cells[c], grid.positions, scoord);
    if(isNaN(cdist) || cdist >= (lo.length * grid.tolerance *grid.tolerance) ) {
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

function createGrid(cells, positions, tolerance) {
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
