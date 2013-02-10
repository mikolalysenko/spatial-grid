"use strict";

var numeric = require("numeric");
var bits = require("bit-twiddle");

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
      return -1;
  };
}

//Computes distance from x to cell c
function cellDistance(c, positions, x) {
  var D = numeric.rep([c.length, c.length], 0.0);
  var dvec = numeric.rep([c.length], 0.0);
  for(var i=0; i<c.length; ++i) {
    var pi = positions[c[i]];
    dvec[i] = -numeric.dot(pi, x);
    for(var j=0; j<c.length; ++j) {
      var pj = positions[c[j]];
      D[i][j] = D[j][i] = numeric.dot(pi, pj);
    }
  }
  var A = numeric.rep([c.length, c.length+2], 0.0);
  var b = numeric.rep([c.length+2], 0.0);
  b[0] = 1.0;
  b[1] = -1.0;
  for(var i=0; i<c.length; ++i) {
    A[i][0]   = 1;
    A[i][1]   = -1
    A[i][i+2] = 1;
  }
  return numeric.solveQP(D, dvec, A, b);
}

//Locates the closest cell within tolerance to x
Grid.prototype.closestCell = function(x) {
  var tolerance = this.tolerance;
  var positions = this.positions;
  var ix = new Array(x.length);
  for(var i=0; i<x.length; ++i) {
    ix[i] = (x[0] / tolerance) | 0;
  }
  var nbhd = this.grid[index(ix)];
  if(!nbhd) {
    return null;
  }
  var d = Number.POSITIVE_INFINITY;
  var r = [];
  for(var i=0; i<nbhd.length; ++i) {
    var c = nbhd[i];
    var t = cellDistance(this.cells[c], positions, x);
    if(Math.abs(t.value - d) < EPSILON) {
      t.cell = i;
      r.push(t);
    } else if(t.value < d) {
      d = t.value;
      t.cell = i;
      r = [ t ];
    }
  }
  var point = numeric.rep([x.length], 0.0);
  var cell = this.cells[r.cell];
  var solution = r.solution;
  for(var i=0; i<cell.length; ++i) {
    var p = positions[cell[i]];
    var w = solution[i];
    for(var j=0; j<x.length; ++j) {
      point[j] += p[j] * w;
    }
  }
  r.point = point;
  return r;
}

function fill0(grid, lo, hi, c) {
  if(grid[0]) {
    grid[0].push(c);
  } else {
    grid[0] = [c];
  }
}

function fill1(grid, lo, hi, c) {
  for(var i=lo[0]; i<=hi[0]; ++i) {
    if(grid[i]) {
      grid[i].push(c);
    } else {
      grid[i] = [c];
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
  for(var i=lo[1]; i<=hi[1]; ++i) {
    var x = expand2(i)<<1;
    for(var j=lo[0]; j<=hi[0]; ++j) {
      var y = x + expand2(j);
      var g = grid[y];
      if(g) {
        g.push(c);
      } else {
        grid[y] = [c];
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
  for(var i=lo[2]; i<=hi[2]; ++i) {
    var x = expand3(i)<<2;
    for(var j=lo[1]; j<=hi[1]; ++j) {
      var y = x + (expand3(j) << 1);
      for(var k=lo[0]; k<=hi[0]; ++k) {
        var z = y + expand3(k);
        var g = grid[z];
        if(g) {
          g.push(c);
        } else {
          grid[z] = [c];
        }
      }
    }
  }
}

function filln(grid, lo, hi, c) {
  throw Error("Not implemented!");
}

function createGrid(mesh, tolerance) {
  var cells = mesh.cells || mesh.faces;
  var positions = mesh.positions;
  var grid = {};
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
      ihi[j] = Math.floor(hi[j] / tolerance) + 1;
    }
    switch(d) {
      case 0:
        fill0(grid, ilo, ihi, i)
      break;
      case 1:
        fill1(grid, ilo, ihi, i);
      break;
      case 2:
        fill2(grid, ilo, ihi, i);
      break;
      case 3:
        fill3(grid, ilo, ihi, i);
      break;
      default:
        filln(grid, ilo, ihi, i);
      break;
    }
  }
  return new Grid(cells, positions, tolerance, grid);
}
module.exports = createGrid;