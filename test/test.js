var mesh = require("bunny");
var grid = require("../index.js")(mesh.cells, mesh.positions, 1.0);
console.log(grid);

console.log(grid.closestCells([ 1, 0, 0]));
console.log(grid.neighborhood([ 1, 0, 0], 1.0));
