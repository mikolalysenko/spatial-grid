spatial-grid
============
Spatial queries on simplicial complexes.

Usage and Installation
======================
First, install via npm:

    npm install spatial-grid
    
Then you can create grids and query them as follows:

    var mesh = require("bunny");
    var grid = require("sptial-grid")(mesh, 0.1);
    var cells = grid.closestCells([1.0, 0.0, 0.0]);

`require("spatial-grid")(mesh, tolerance)`
-----------------------------------------
Creates a spatial grid over the simplicial complex determined by `[positions, cells]` with cell size = `tolerance`.

* `mesh` is an object containing the following fields
    + `cells` (or optionally `faces`): an array of cells, represented as indices
    + `positions`: An array of position vectors
* `tolerance`: The resolution of the cell complex

Returns a spatial grid for the cell complex.

`grid.closestCells(x)`
---------------------
Returns information about the closest cell to the point `x` within the specified tolerance.

* `x` is a point

Returns: If no cell is within `tolerance`, returns `null`.  Otherwise, returns an object with the following parameters:

* `cells`: An array of cells of approximately equal distance to `x`
* `points`: An array of points closest to x
* `distance`: The distance to the surface from `x`


Credits
=======
(c) 2013 Mikola Lysenko. BSD
