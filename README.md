spatial-grid
============
Spatial queries on simplicial complexes in arbitrary dimensions.

Usage and Installation
======================
First, install via npm:

    npm install spatial-grid
    
Then you can create grids and query them as follows:

    var bunny = require("bunny");
    var grid = require("spatial-grid")(bunny.cells, bunny.positions, 0.1);
    console.log(grid.closestCells([1.0, 0.0, 0.0]));
    
Which returns the following data:

    { points: [ [ 1.0520095436290573, 0.2639268057343442, 0.10221864065360134 ] ],
      cells: [ 3507 ],
      distance: 0.2877690079051383 }

The code should work for two dimensional meshes, tetrahedral volume, and other higher dimensional structures.

`require("spatial-grid")(cells, positions, tolerance)`
-----------------------------------------
Creates a spatial grid over the simplicial complex determined by `[positions, cells]` with cell size = `tolerance`.

* `cells` is an abstract simplicial complex represented by an array of arrays of indices
* `positions` is an array of positions for the 0-cells
* `tolerance`: The resolution of the cell complex

Returns a spatial grid for the cell complex.

`grid.closestCells(x)`
---------------------
Returns information about the closest cell to the point `x` within the specified tolerance.

* `x` is a point

Returns: If no cell is within `tolerance`, returns `null`.  Otherwise, returns an object with the following parameters:

* `cells`: An array of cells of approximately equal distance to `x` (within a tolerance of +/-1e-6 )
* `points`: An array of points closest to x
* `distance`: The squared distance to the surface from `x`

`grid.neighborhood(x, radius)`
------------------------------
Returns all of the cells in the complex which are within `radius` distance of the point `x`.


Notes
=====
Currently the library is built on top of the FORTRAN code quadprog, which solves the simplex-closest point problem.  If this library gets popular enough, I may eventually add faster routines for low dimensional queries.  For high dimensions, the search routines used in this library become exponentially less efficient.  However the performance should be "good enough" for d <= 3, and it is probably usable up to d<=5.

Credits
=======
(c) 2013 Mikola Lysenko. BSD
