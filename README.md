Calendar Tiler
=================
An algorithm for aesthetically displaying appointments/events on a calendar, with an implementation in JS.

Table of Contents
=================

  * [Calendar Tiler](#calendar-tiler)
  * [Table of Contents](#table-of-contents)
  * [Why Do](#why-do)
  * [How Use](#how-use)
  * [Algorithm Preface](#algorithm-preface)
  * [Algorithm Overview](#algorithm-overview)
  * [Examples With Diagrams](@examples-with-diagrams)
  * [Building Columns](#building-columns)
  * [Building Alignments](#building-alignments)
  * [Building Fill Space Directed Acyclic Graphs](#building-fill-space-directed-acyclic-graphs)
  * [Building Time Respective Directed Acyclic Graphs](#building-time-respective-directed-acyclic-graphs)
  * [Conclusions](#conclusions)

Why Do
=================
At work (https://fieldnimble.com/) we needed a way to display the calendars of many users all at once and have the appointments/visits/events/what-have-you render in a clean and aesthetically pleasing way. So I designed this algorithm and then implemented it in JS. It's gone through several iterations and eventually ended up the way it is now because it offers several aesthetic variations and performance options.

How Use
=================
Please consult the example files to see the full process in action and to see how it could be used from start to finish.

There's only one public facing function, `window.calendarTiler.tileAppointments`, it can be called with two parameters,
* `appointments` [Required] (Type: Array[Object]) that need to be tiled they, need to include 2 properties in order to be tiled,
    1. `<START_VALUE>` (Type: number) specifying the start of the appointment
    2. `<END_VALUE>` (or `<DURATION_VALUE>`) (Type: number) specifying the end of the appointment (or the duration of the appointment), note that if you are not using durational units, then `<END_VALUE>` must be greater than `<START_VALUE>` and if you are using durational units then `<DURATION_VALUE>` must be greater than 0.
* `tileParameters` (Type: object) that has 4 properties,
    1. `start` (Type: string - Default Value: `"start"`) which specifies the property `<START_VALUE>` for each appointment (e.g. `"start"`, `"startTime"`, `"startingTime"`, etc.)
    2. `delineator` (Type: string - Default Value: `"end"`) which specifies the property `<END_VALUE>` (or `<DURATION_VALUE>`) for each appointment (e.g. `"end"`, `"endTime"`, `"endingTime"`, `"duration"`, `"appointmentLength"` etc.)
    3. `usesDuration` (Type: Boolean - Default Value: `false`) which specifies that the `delineator` represents a durational unit as opposed to a time unit.
    4. `tilingMethod` (Type: string - Default Value: `fillSpace`) which specifies the way the appointments are tiled
        * `balanced` this indicates that each appointment should have the same width, it's the fastest of the three options since there are no graph calculations to make, though some of the appointments may not be as wide as they can be, which may leave the layout looking a little sparse in some cases.
        * `fillSpace` this indicates that each appointment should take up as much space as it possibly can while retailing a space efficient layout. It's slower than `balanced` since there are graph calculations to make, but it produces the most aesthetically pleasing result of the three options.
        * `timeRespective` this indicates that appointments with later start times should always appear as far to the left as possible. It's the slowest of the three options and the layout it produces is somewhat of an acquired taste (straight up ugly in cases with large numbers of appointments. Combining this with the slowness in computation using this method, makes me suspicious that reality has some inherent aesthetic bias towards other methods.), but it's the most rigidly ordered of the three options.

The output is a single object with 2 properties,
* `sortedAppointments` (Type: Array[Object]) containing the input appointments sorted into a new array by `start` ascending and `end` descending
* `positions` (Type: Array[Object]) in the same order as the `sortedAppointments` order, each member contains 4 properties
    1. `x` (Type: number) the x-coordinate for where the sorted appointment should be placed on the x-axis
    2. `dx` (Type: number) the width for how wide the sorted appointment should be on the x-axis
    3. `y` (Type: number) the y-coordinate for where the sorted appointment should be placed on the y-axis (note is this just `start` of the appointment)
    4. `dy` (Type: number) the height for how tall the sorted appointment should be on the y-axis (note this is just `end` - `start` or `duration` for the appointment)

Please note that the `x` and `dx` values are normalized between 0 and 1, while the `y` and `dy` keep the units of the input appointments.

Input Examples ... 
* Using default `tileParameters`,
    1. `appointments = [{ start: 0, end: 12 }, { start: 4.5, end: 6.75 }, { start: 13.25, end: 19.5 }]`
* Passing `tileParameters`,
    1. `appointments = [{ wEirDsTart: 7.5, ohADuration: 21.25 }, { wEirDsTart: 14.25, ohADuration: 16.75 }, { wEirDsTart: 22, ohADuration: 23.75 }]`
    2. `tileParameters = { start: "wEirDsTart", delineator: "ohADuration", usesDuration: true, tilingMethod: "fillSpace" }`

Algorithm Preface
=================
The algorithm works by accepting an array of appointments `A` as an input, where each appointment `a` has a start value `s_a` and an end value `e_a`. In principal `s_a` and `e_a` can be any real valued numbers with `s_a < e_a` (however `0 <= s_a < e_a <= 24` is an obvious use case).

The goal of the algorithm is to produce an array called `Positions_A` which for each appointment `a` in `A` contains a 4-dimensional vector `positions_a = (y_a, dy_a, x_a, dx_a)` where
* `x_a` is the horizontal position of the appointment
* `dx_a` is the width of the appointment
* `y_a` is vertical position of the appointment (Note: This is given by `s_a`)
* `dy_a` is the height of the appointment (Note: This is either given by `e_a`, or it can be easily computed as `e_a - s_a` if inputs are in durational units.)

As previously noted, `x_a` and `dx_a` values are normalized between 0 and 1, while the `y_a` and `dy_a` keep the units of the input appointments. So that,
* `0 <= x_a < 1` and `0 < dx_a <= 1`
for each `a` in `A`.

The idea being that each appointment `a` can then be placed on the 2-dimensional `(x, y)` plane with the following set of points corresponding to a box that represents each appointment `a` (from upper-left, upper-right, lower-right, lower-left) in clockwise fashion,
`Box_a = { (x_a, y_a), (x_a + dx_a, y_a), (x_a + dx_a, y_a + dy_a), (x_a, y_a + dy_a) }`

So how do we go about producing `Positions_A`? Since `y_a` and `dy_a` are already given we only need to find `x_a` and `dx_a` for each `a` in `A`.

Algorithm Overview
==================
As a convention for any `aaray` let,
    * `lastIndex` be the last index (i.e. `array.length - 1` for a 0-based array scheme and `array.length` for a 1-based array scheme).
    * `firstIndex` be the first index (i.e. 0 for a 0-based array scheme and 1 for a 1-based array scheme).

Regardless of the selected tiling method (balanced, fill space or time respective), the first step is always the same.

Sort `A` by the following rule,
* `a <= b iff y_a < y_b or (y_a == y_b and dy_a >= dy_b)` for `a` and `b` in `A`
This sorting simply means that appointments are sorted in ascending fashion by start time and then in descending fashion by duration should they have equal start times.
NOTE: From now on we'll just assume that `A` is sorted as above.

After the sorting step, we move onto one of 3 subroutines each corresponding to one of the 3 different tiling method.

The balanced and fill space tiling methods both begin the same way.
* We generate an array of columns, each column is an array of appointments which are stacked on top of each other, with new columns being generated when an appointment cannot be stacked in a previous column without a collision between another appointment in that column.

The time respective method generates what can best be described as alignments as opposed to the columns in the other methods.
* The alignments are a series of rules which describe how one appointment "locks in" other appointments with respect to the appointments before and after it in the sort order.

NOTE: The procedures for obtaining the columns/alignments are detailed in (#building-columns) and (#building-alignments) respectively.

In the case of the balanced method the `x` and `dx` values are easily computed using the columns by proceeding as follows,
* Iterate over the columns, `x_a = index / columns.length` for all `a` in `columns[index]`
* `dx_a = 1 / columns.length` for all `a` in `columns[index]`

At this point the balanced method is finished and `Positon_A` is complete.

In the case of the fill space and time respective methods, it's a bit more complicated. The first step is to create two Directed Acyclic Graphs (DAG for short) using either the columns or alignments. The procedures for building these can be found in (#building-fill-space-directed-acyclic-graphs) and in (#building-time-respective-directed-acyclic-graphs) respectively. The first DAG, will be referred to as `backward` and is constructed by moving through the columns or alignments backwards. The second DAG, will be referred to as `forward` and is constructed by moving through the columns in ascending fashion.

The reason for needing two DAGs is simple, we need to find the longest chain of colliding appointments for which `a` is a part of for each `a` in `A`.

Once the two DAGs are constructed, we build a Topological Ordering on the vertices in each DAG so that they can be easily traversed to find the longest path through `a` in each DAG for each `a` in `A`. The longest traversal through `a` from `backward` is combined with the longest traversal through `a` from `forward` to create `longest_traversal_a`, which is an array of appointment indices in a particular order (namely the Topological Ordering). The set of such traversal is `Longest_Traversals_A` which is the set of distinct `longest_traversal_a` and is sorted so that the longest traversals come first.

The point of doing this is, is so that we can easily assign an `x` and `dx` value to each appointment based on its position in the traversals. The procedure for doing this is as follows,
* Iterate over `Longest_Traversals_A` using the sort order (longest traversals first) by `i`
* Let `traversal = Longest_Traversals_A[i]`
    1. Iterate over `traversal` by `j`
    2. Then for each appointment `a` in `traversal`
        * Let `previous = j > 0 ? traversal[j - 1] : null`
        * `x_a = previous == null ? 0 : x_previous + dx_previous`
        * Set `dx = calculateBlockingDx(traversal, j, x_a)`
            1. ... insert subroutine
        * If `x_a == 0` then `dx_a` = `dx != null ? dx : calculateNonBlockingDx(traversal)`
            1. ... insert subroutine

Thus we have computed `x_a` and `dx_a` for each `a` in `A` and so `Postions_A` is complete.

Examples With Diagrams
======================

Building Columns
================
Building the columns is very straightforward, essentially we just try to keep pushing appointments to the foremost available column as follows,

* Initialize `columns = [[A[firstIndexx]]]``
* For each `a` in `A`,
    1. For each `column` in `columns`
    2. If `s_a` >= `e_column[lastIndex]` add `a` to end of `column`
    3. Else if `a` was not added to any column then add a new column `[a]` to `columns`

Building Alignments
===================

Building Fill Space Directed Acyclic Graphs
===========================================

Building Time Respective Directed Acyclic Graphs
================================================
After computing the alignments (#building-alignments) building the DAGs is very straightforward.

As a reminder there are two DAGs (`backward` and `forward`).

* For each `a` in `A`
    1. For each `b` in `A`
        * If `alignments.rFront[b][firstIndex] === a` add an edge to `backward` from `a` to `b`
        * If `alignments.rBack[b][lastIndex] === a` add an edge to `forward` from `a` to `b`

Conclusions
==============
More to come (namely specific implementation choices), you can examine the code (and/or example files) first though if you don't feel like waiting ;)
