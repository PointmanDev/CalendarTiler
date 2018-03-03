# Calendar Tiler #
An algorithm for aesthetically displaying appointments/events on a calendar, implemented in JavaScript.

# Table of Contents #
  * [Calendar Tiler](#calendar-tiler)
  * [Table of Contents](#table-of-contents)
  * [Why](#why)
  * [Usage](#usage)
    * [Installation](#installation)
    * [API](#api)
    * [Examples](#examples)
        * [Using Default Tile Parameters](#using-default-tile-parameters)
        * [Passing User Defined Tile Parameters](#passing-user-defined-tile-parameters)
  * [Algorithm Preface](#algorithm-preface)
  * [Algorithm Overview](#algorithm-overview)
  * [Algorithm Details](#algorithm-details)
    * [Building Columns](#building-columns)
    * [Building Alignments](#building-alignments)
    * [Building Fill Space Directed Acyclic Graphs](#building-fill-space-directed-acyclic-graphs)
    * [Building Time Respective Directed Acyclic Graphs](#building-time-respective-directed-acyclic-graphs)
    * [Diagrams](@diagrams)
  * [Conclusions](#conclusions)

# Why #
At [work](https://www.pointmanhq.com/products/field-nimble) we needed a way to display the calendars of many users all at once and have the appointments/events/visits/what-have-you render in a clean and aesthetically pleasing way. So I designed what I thought was a good algorithm and then eventually realized there were several variations that could be made to give different visual flavors.

# Usage #
CalendarTiler is written in ES5 following the [Universal Module Definition (UMD)](https://github.com/umdjs/umd) so that it can be used in the browser or in Node.js without needing to do any extra work. All the code exists in a single file,
```
calendar-tiler/calendarTiler.js
```

## Installation ##
Using npm: [calendar-tiler](https://www.npmjs.com/package/calendar-tiler)
```
npm install calendar-tiler
```

## API ##
There's only one public facing function, `calendarTiler.tileAppointments`, it can be called with two parameters,
1. `appointments` (**Required**) (Type: *Array[Object]*) objects to be tiled, each appointment needs to include 2 properties,
    1. `<START_VALUE>` (Type: *Number*) specifying the start of the appointment
    2. `<END_VALUE>`/`<DURATION_VALUE>` (Type: *Number*) specifying the end of the appointment (or the duration of the appointment), note that if you are not using durational units, then `<END_VALUE>` must be greater than `<START_VALUE>` and if you are using durational units then `<DURATION_VALUE>` must be greater than 0.
2. `tileParameters` (Type: *Object*) that has 4 properties,
    1. `start` (Type: *String* - Default Value: `'start'`) which specifies the property `<START_VALUE>` for each appointment (e.g. `'start'`, `'startTime'`, `'startingTime'`, etc.)
    2. `delineator` (Type: *String* - Default Value: `'end'`) which specifies the property `<END_VALUE>`/`<DURATION_VALUE>` for each appointment (e.g. `'end'`, `'endTime'`, `'endingTime'`, `'duration'`, `'appointmentLength'` etc.)
    3. `usesDuration` (Type: *Boolean* - Default Value: `false`) which specifies that the `delineator` represents a durational unit as opposed to a time unit.
    4. `tilingMethod` (Type: *String* - Default Value: `'fillSpace'`) which specifies the way the appointments are tiled
        1. `'balanced'` this indicates that each appointment should have the same width, it's the fastest of the three options since there are no graph calculations to make, though some of the appointments may not be as wide as they can be, which may leave the layout looking a little sparse in some cases.
        2. `'fillSpace'` this indicates that each appointment should take up as much space as it possibly can while retailing a space efficient layout. It's slower than `balanced` since there are graph calculations to make, but it produces arguably the most aesthetically pleasing result of the three options.
        3. `'timeRespective'` this indicates that appointments with later start times should always appear as far to the left as possible. It's the slowest of the three options and the layout it produces is somewhat of an acquired taste (straight up ugly in cases with large numbers of appointments. Combining this with the slowness in computation using this method, makes me suspicious that reality has some inherent aesthetic bias towards other methods), but it's the most rigidly ordered of the three options.

The output is a single object with 2 properties,
1. `sortedAppointments` (Type: *Array[Object]*) containing the input appointments sorted into a new array by `start` ascending and `end` descending
2. `positions` (Type: *Array[Object]*) in the same order as the `sortedAppointments` order, each member contains 4 properties
    1. `x` (Type: *Number*) the x-coordinate for where the sorted appointment should be placed on the x-axis
    2. `dx` (Type: *Number*) the width for how wide the sorted appointment should be on the x-axis
    3. `y` (Type: *Number*) the y-coordinate for where the sorted appointment should be placed on the y-axis (note is this just `start` of the appointment)
    4. `dy` (Type: *Number*) the height for how tall the sorted appointment should be on the y-axis (note this is just `end` - `start` or `duration` for the appointment)

Please note that the `x` and `dx` values are normalized between 0 and 1, while the `y` and `dy` keep the units of the input appointments.

## Examples ##
Please consult the example files to see the full process in action and to see how it could be used from start to finish.

### Using Default Tile Parameters ###
```javascript
    var appointments = [{
            start: 0,
            end: 12
        }, {
            start: 13.25,
            end: 19.5
        }, {
            start: 4.5,
            end: 6.75
        }],
        tiling = calendarTiler.tileAppointments(appointments);

    /*  Outputs:
        tiling = {
            sortedAppointments: [{
                start: 0,
                end: 12
            }, {
                start: 4.5,
                end: 6.75
            }, {
                start: 13.25,
                end: 19.5
            }],
            positions: [{
                x: 0,
                dx: 0.5,
                y: 0,
                dy: 12
            }, {
                x: 0.5,
                dx: 0.5,
                y: 4.5,
                dy: 2.25
            }, {
                x: 0,
                dx: 1,
                y: 13.25,
                dy: 6.25
            }]
        }
    */
```

### Passing User Defined Tile Parameters ###
```javascript
    var appointments = [{
            startingTime: 0,
            duration: 12
        }, {
            startingTime: 13.25,
            duration: 6.25
        }, {
            startingTime: 4.5,
            duration: 2.25
        }],
        tileParameters = {
            start: `startingTime`,
            delineator: `duration`,
            usesDuration: true,
            tilingMethod: `balanced`
        },
        tiling = calendarTiler.tileAppointments(appointments);

    /*  Outputs:
        tiling = {
            sortedAppointments: [{
                startingTime: 0,
                duration: 12
            }, {
                startingTime: 4.5,
                duration: 2.25
            }, {
                startingTime: 13.25,
                duration: 6.25
            }],
            positions: [{
                x: 0,
                dx: 0.5,
                y: 0,
                dy: 12
            }, {
                x: 0.5,
                dx: 0.5,
                y: 4.5,
                dy: 2.25
            }, {
                x: 0,
                dx: 1,
                y: 13.25,
                dy: 6.25
            }]
        }
    */
```

# Algorithm Preface #
**NOTE**: All following psuedocode will use 1-based indexing on Lists/Arrays/Enumerable Collections (I don't feel like writing `list.Length - 1` or `array.Length - 1` a thousand times)

The algorithm works by accepting an array of appointments `A` as an input, where each appointment `a` has a start value `a.start` and an end value `a.end`. In principal `a.start` and `a.end` can be any real valued numbers with `a.start < a.end` (however `0 <= a.start < a.end <= 24` is an obvious use case).

**NOTE**: Through abuse of notation, `collection[a]` means `collection[i]` where `a = A[i]`

The goal of the algorithm is to produce an array called `positions` which for each appointment `a` in `A` contains a 4-dimensional vector `position[a] = {x, dx, y, dy}` where
* `x` is the horizontal position of the appointment `a`
* `dx` is the width of the appointment `a`
* `y` is vertical position of the appointment `a` (Note: This is given by `a.start`)
* `dy` is the height of the appointment `a` (Note: This is either given by `a.end`, or it can be easily computed as `a.end - a.start` if inputs are not durational units.)

As previously noted, for each `a` in `A`, `positions[a].x` and `positions[a].dx` values are normalized between 0 and 1, while the `positions[a].y` and `positions[a].dy` keep the units of the input appointments.
```
0 <= positions[a].x < 1
0 < positions[a].dx <= 1
```
The idea being that each appointment `a` can then be placed on the 2-dimensional `(x, y)` plane with the following set of points corresponding to a box that represents each appointment `a` (from upper-left, upper-right, lower-right, lower-left) in clockwise fashion,
```
{
    (positions[a].x, positions[a].y),
    (positions[a].x + positions[a].dx, positions[a].y),
    (positions[a].x + positions[a].dx, positions[a].y + positions[a].dy),
    (positions[a].x, positions[a].y + positions[a].dy)
}
```
So how do we go about producing `positions`? Since `positions[a].y` and `positions[a].dy` are already given (or easily computed using the `a.start` and `a.end` we only need to find `positions[a].x` and `positions[a].dx` for each `a` in `A`.

# Algorithm Overview #
Regardless of the selected tiling method (balanced, fill space or time respective), the first step is always the same.

Sort `A` (using your favorite comparison sort) by the following rule,
```
a <= b IFF a.start < b.start OR (a.start == b.start AND a.end >= b.end)
```
This sorting simply means that appointments are sorted in ascending fashion by start time and then in descending fashion by end time/duration should they have equal start times.

**NOTE**: From now on we'll assume that `A` is sorted as above. We'll also assume that `a.end` is using absolute units (as opposed to duration units).

Now initialize the `positions` array as follows,
```
InitializePositions(A)
 1. SET positions = new Array[A.Length]
 2. FOR i = 1 TO A.Length
 3.     SET positions[i] = {
 4.         x: 0,
 5.         dx: 1,
 6.         y: A[i].start,
 7.         dy: A[i].end - A[i].start
 8.     }
 9. ENDFOR
10. RETURN positions
```
After the sorting step, we move onto one of 3 subroutines each corresponding to one of the 3 different tiling method.

The balanced and fill space tiling methods both begin the same way. We generate an array of columns, each column is an array of appointments which are stacked on top of each other, with new columns being generated when an appointment cannot be stacked in a previous column without a collision between another appointment in that column. Details for the procedure to construct said columns can be found here [Building Columns](#building-columns).

The time respective method generates what can best be described as alignments as opposed to the columns in the other methods. The alignments are a series of rules which describe how one appointment "locks in" other appointments with respect to the appointments before and after it in the sort order. Details for the procedure to construct said alignments can be found here [Building Alignments](#building-alignments).

In the case of the balanced method the `x` and `dx` values are easily computed using the columns by proceeding as follows,
```
CalcuatePositionsForBalancedTilingMethod(positions, columns)
 1. SET columnsLength = columns.Length
 2. FOR i = 1 TO columns.Length
 3.     FOR j = 1 TO columns[i].Length
 4.         SET positions[i].x = i / columnsLength
 5.         SET positions[i].dx = 1 / columnsLength
 6.     ENDFOR
 7. ENDFOR
```
At this point the balanced method is finished and `positions` is complete. The user could now display the appointments on screen using the given `positions` array.

In the case of the fill space and time respective methods, it's a bit more complicated. The first step is to create two Directed Acyclic Graphs (DAG for short) using either the columns or alignments. The procedures for building these can be found in [Building Fill Space Directed Acyclic Graphs](#building-fill-space-directed-acyclic-graphs) and [Building Time Respective Directed Acyclic Graphs](#building-time-respective-directed-acyclic-graphs) respectively. The first DAG, will be referred to as `backward` and is constructed by moving through the columns or alignments backwards. The second DAG, will be referred to as `forward` and is constructed by moving through the columns in ascending fashion.

The reason for needing two DAGs is simple, we need to find the longest chain of colliding appointments for which `a` is a part of for each `a` in `A`.

Once the two DAGs are constructed, we build a Topological Ordering on the vertices in each DAG so that they can be easily traversed to find the longest path through `a` in each DAG for each `a` in `A`. Then we generate the distinct longest traversals as follows,
```
GenerateLongestDagTraversals(positions, dags)
 1. SET longestDagTraversals = new List
 2. SET traversalKeys = new Map
 3. SET longestDagTraversal = NULL
 4. SET traversalKey = NULL
 5. FOR i = 1 TO positions.Length
 6.     SET longestDagTraversal = dags.backward.GetLongestTraversalThroughVertex(i).Reverse()
 7.     longestDagTraversal.Add(i)
 8.     longestDagTraversal.AddRange(dags.forward.GetLongestTraversalThroughVertex(i))
 9.     SET traversalKey = longestDagTraversal.Join(',')
10.     IF traversalKeys.Find(traversalKey) != NULL
11.         traversalKeys.Add(traversalKey, TRUE)
12.         longestDagTraversals.Add(longestDagTraversal)
13.     ENDIF
14. ENDFOR
15. RETURN longestDagTraversals.Sort(CompareDagTraversalLengths)

CompareDagTraversalLengths(dagTraversal1, dagTraversal2)
 1. RETURN dagTraversal2.Length > dagTraversal1.Length

List.Join(delineator)
 1. SET joined = new String
 2. FOR i = 1 TO THIS.Length
 3.     joined.Concatenate(THIS[i].ToString())
 4.     IF i < THIS.Length
 5.         joined.Concatenate(delineator)
 6.     ENDIF
 7. ENDFOR
 8. RETURN joined
```
The point of doing this is, is so that we can easily assign an `x` and `dx` value to each appointment based on its position in the traversals. The procedure for doing this is as follows,
```
CalcuatePositionsUsingLongestDagTraversals(positions, longestDagTraversals)
 1. SET a = NULL
 2. SET beforeA = NULL
 3. SET x = 0
 4. SET dx = NULL
 5. FOR i = 1 TO longestDagTraversals.Length
 6.     SET traveral = longestDagTraversals[i]
 7.     FOR j = 1 TO traversal.Length
 8.         SET a = traversal[j]
 9.         IF j > 1
10.             SET beforeA = traversal[j - 1]
11.             SET x = positions[beforeA].x + positions[beforeA].dx
12.         ELSE
13.             SET x = 0
14.         ENDIF
15.         SET dx = CalculateBlockingDx(positions, traversal, j, x)
16.         IF positions[a].x == 0
17.             SET positions[a].x = x
18.             IF dx != NULL
19.                 SET positions[a].dx = dx
20.             ELSE
21.                 SET positions[a].dx = CalculateNonBlockingDx(positions, traversal)
22.             ENDIF
23.         ENDIF
24.     ENDFOR
25. ENDFOR

CalculateBlockingDx(positions, traversal, index, x)
 1. FOR i = index + 1 TO traversal.Length
 2.     IF positions[traversal[i]].x == 0
 3.         RETURN positions[traversal[i]].x - x) / (i - index)
 4.     ENDIF
 5. ENDFOR
 6. RETURN NULL

CalculateNonBlockingDx(positions, traversal)
 1. SET unset = 0
 2. SET dx = 0
 3. FOR i = 0 TO traversal.Length
 4.     IF positions[traversal[i]].dx < 1
 5.         SET dx = dx + positions[traversal[i]].dx
 6.     ELSE
 7.         INCREMENT unset
 8.     ENDIF
 9. ENDFOR
10. IF unset == 0
11.     SET unset = 1
12. ENDIF
13. RETURN (1 - dx) / unset
```
The essence of this procedure is trying to fill out the longest traversals first to ensure these appointments receive the proper `x` and `dx` values first. If there are appointments ahead of a given appointment `a` in the traversal which have has their `x` and `dx` values then `a` will have restricted `x` and `dx` values. If there are no appointments ahead of `a` in the traversal which have already been assigned `x` and `dx` values then we need to provision space for those appointments so they will have enough space when their assignments come.

Thus we have computed `positions[a].x` and `positions[a].dx` for each `a` in `A` and so `positions` is complete. The user could now display the appointments on screen using the given `positions` array.

# Algorithm Details #
## Building Columns ##
Building the columns is very straightforward, essentially we just try to keep pushing appointments to the foremost available column as follows,
```
ConstructColumns(A)
 1. SET columns = new List
 2. columns.Add(new List)
 3. columns[1].Add(A[1])
 4. FOR i = 1 TO A.Length
 5.     FOR j = 1 TO columns.Length
 6.         SET column = columns[j]
 7.         IF A[i].start >= column[column.Length].end
 8.             column[j].Add(A[i])
 9.             column = NULL
10.             BREAK
11.         ENDIF
12.     ENDFOR
13.     IF column != NULL
14.         columns.Add(new List)
15.         columns[columns.Length].Add(A[i])
16.     ENDIF
17. ENDFOR
18. RETURN columns
```

## Building Alignments ##
```
```

## Building Fill Space Directed Acyclic Graphs ##
After computing the columns ([Building Columns](#building-columns)) building the DAG isn't too difficult.
```
```

## Building Time Respective Directed Acyclic Graphs ##
After computing the alignments ([Building Alignments](#building-alignments)) building the DAGs is very straightforward.
```
BuildTimeRespectiveDAG(A, alignments)
 1. SET forward = new Dag(A.Length)
 2. SET backward = new Dag(A.Length)
 3. FOR i = 1 TO A.Length
 4.     FOR j = 1 TO A.Length
 5.         IF alignments.rFront[A[j]][1] === A[i]
 6.             backward.AddEdge(A[i], A[j])
 7.         ENDIF
 8.         IF alignments.rBack[A[j]][alignments.rBack[A[j].Length] === A[i]
 9.             forward.AddEdge(A[i], A[j])
10.        ENDIF
11.     ENDFOR
12. ENDFOR
13. RETURN (backwardDag, forwardDag)
```

## Diagrams ##
We'll use the following set of appointments

# Conclusions #
More to come (namely specific implementation choices), you can examine the code (and/or example files) first though if you don't feel like waiting ;)
