var mesh = require("conway-hart")("C");
var grid = require("../index.js")(mesh, 0.5);
console.log(grid);

console.log(grid.closestCells([ 1, 0, 0]));
console.log(grid.closestCells([ 1, 1, 1]));
