# CalendarTiler
An algorithm for aesthetically displaying appointments/events on a calendar, currently implemented in JS (more languages to come).

# Why?
At work (https://fieldnimble.com/) we needed a way to display the calendars of many users all at once and have the appointments/visits/events/what-have-you in a clean aesthetically pleasing way. So I designed this algorithm and then implemented it in JS. It's gone through several iterations and eventually ended up the way it is now because it is both space efficient and aesthetically pleasing.

# Usage
Please consult the example files to see the full process in action and to how it could be used from start to finish.

There's only one public facing function, `window.calendarTiler.tileAppointments`, it can be called with two parameters,
* `appointments` (Required) which is an array of objects (appointments) that need to be tiled they, need to include 2 properties in order to be tiled,
    1. `<START_VALUE>` a number specifying the start of the appointment
    2. `<END_VALUE>` (or `<DURATION_VALUE>`) a number specifying the end of the appointment (or the duration of the appointment), note that if you are not using durational units, then `<END_VALUE>` must be greater than `<START_VALUE>`
* `tileParameters` (Optional) which is an object that has 4 properties,
    1. `start` a string (Default Value: `"start"`) which specifies the property `<START_VALUE>` for each appointment (e.g. `"start"`, `"startTime"`, `"startingTime"`, etc.)
    2. `delineator` a string (Default Value: `"end"`) which specifies the property `<END_VALUE>` (or `<DURATION_VALUE>`) for each appointment (e.g. `"end"`, `"endTime"`, `"endingTime"`, `"duration"`, `"appointmentLength"` etc.)
    3. `usesDuration` a Boolean (Default Value: `false`) which specifies that the `delineator` represents a durational unit as opposed to a time unit.
    4. `tilingMethod` a string (Default Value: `fillSpace`) which specifies the way the appointments are tiled
        * `balanced` this indicates that each appointment should have the same width, it's the fastest of the three options since there are no graph calculations to make, though some of the appointments may not be as wide as they can be which may leave the layout looking a little sparse in some cases.
        * `fillSpace` this indicates that each appointment should take up as much space as it possibly can while retailing a space efficient layout. It's slower than `balanced` since there are graph calculations to make, but it produces the most aesthetically pleasing result of the three options.
        * `timeRespective` this indicates that appointments with later start times should always appear as far to the left as possible. It's the slowest of the three options and produces the least aesthetically pleasing layout, but it's the most ordered of the three options.

The output is a single object with 5 properties,
* `sortedAppointments` an array containing the input appointments sorted into a new array by `start` ascending and `end` descending
* `x` an array of the x-coordinates for where each appointment should be placed on the x-axis
* `dx` an array of the widths for how wide each appointment should be on the x-axis
* `y` an array of the y-coordinates for where each appointment should be placed on the y-axis (note these are just the `start` values of each appointment)
* `dy` an array of the heights for how tall each appointment should be on the y-axis (note these are just `end` - `start` or `duration` for each appointment)

Please note that the `x` and `dx` values are normalized between 0 and 1 while the `y` and `dy` keep the units of the input appointments.

# Input Examples
* Using default `tileParameters`,
    1. `appointments = [{ start: 0, end: 12 }, { start: 4.5, end: 6.75 }, { start: 13.25, end: 19.5 }]`
* Passing `tileParameters`,
    1. `appointments = [{ wEirDsTart: 7.5, ohADuration: 21.25 }, { wEirDsTart: 14.25, ohADuration: 16.75 }, { wEirDsTart: 22, ohADuration: 23.75 }]`
    2. `tileParameters = { start: "wEirDsTart", delineator: "ohADuration", usesDuration: true, tilingMethod: "fillSpace" }`

# The Algorithm
There are actually 3 different algorithms at work here depending on the `tilingMethod` selected.

The algorithms work by accepting an array of appointments `A` as an input, where each appointment `a` has a start value `s_a` and an end value `e_a`. In principal `s_a` and `e_a` can be any real valued numbers with `s_a < e_a` (however `0 < s_a < e_a <= 24` is a typical use case).

The goal of the algorithm is to produce a array `Tiling_A` which for each appointment `a` in `A` contains a 4-dimensional vector `tile_a = (s_a, e_a, x_a, w_a)` where
* `s_a` is the start value
* `e_a` is the end value
* `x_a` is the horizontal value
* `w_a` is the width value ... the choice of `w` over `y` was a tough one ;)

The width of the entire schedule period is normalized to be `1` so that
* `0 <= x_a < 1` and `0 < w_a <= 1`
for each `a` in `A`.

The idea being that each appointment `a` can then be placed on the 2-dimensional `(x, y)` plane with the following set of points corresponding to a box that represents each appointment `a` (from upper-left, upper-right, lower-right, lower-left) in clockwise fashion,
`Box_a = { (x_a, s_a), (x_a + w_a, s_a), (x_a + w_a, e_a), (x_a, e_a) }`

So how do we go about producing `Tiling_A`? The idea is to construct a directed acyclic graph (DAG for short) `DAG_A` and use the set of traversals to find `x_a` and `w_a` for each `a` in `A`.

#TL;DR
* Sort `A` into a new array `Sorted_A` by the following rule, `a <= b iff s_a < s_b or (s_a == s_b and e_a >= e_b)` for `a` and `b` in `A`
* Either create columns or alignments based on the `tilingMethod`
* If the `tilingMethod` is `fillSpace` or `timeRespective` then create a DAG
* If a DAG was created then for each appointment find the longest path in the DAG that crosses though its vertex and set `x_a` and `w_a` using that path.
* If no DAG was created (i.e. `tilingMethod` is `balanced`) then use the columns to calculate `x_a` and `w_a`.

# Balanced Tiling Method
When `tilingMethod` is set to `balanced` there are no DAG calculations to make so the process is very simple

# Fill Space Tiling Method
This tiling method actually begins the same way that the balanced tiling method does.

# Time Respective Tiling Method
Step 1: Sort `A` into a new array `Sorted_A` by the following rule,
* `a <= b iff s_a < s_b or (s_a == s_b and e_a >= e_b)` for `a` and `b` in `A`
This sorting simply means that appointments are sorted in ascending fashion by start time and then in descending fashion by end time should they have equal start times. From now on we'll just assume that `A` is sorted as above so I don't need to keep typing `Sorted_A`.

Pictorally (Diagram 1) this would resemble the following,

    +---------+
    |    0    |
    |         +---------+
    |         |    1    +---------+
    |         |         |    2    |
    |         |         |         |
    |         |         |         |
    |         +---------+         +---------+
    |         |         |         |    3    |
    |         |         |         |         |
    |         |         +---------+         +---------+
    +---------+                   |         |    4    |
                                  |         |         |
                                  +---------+         +---------+
                                            |         |    5    |
                                            +---------+         +---------+
                                                      |         |    6    +---------+---------+
                                                      +---------+         |    7    |    8    |
                                                                |         |         |         |
                                                                +---------+         |         |
                                                                          |         |         |
                                                                          +---------+---------+

Step 2: For each `a` in `A` build 2 arrays called `Back_a` and `Front_a` by the following rules,
* `b` in `Back_a` iff `b` comes before `a` in the sort order and `e_b > s_a`
* `b` in `Front_a` iff `b` comes after `a` in the sort order and `s_b < e_a`

Intuitively `Back_a` contains all the appointments which 'collide' with `a` and come before `a` in the sort order and `Front_a` contains all the appointments which 'collide' with `a` and appear after `a` in the sort order. Now let `Back_A` be the array of all the `Back_a` and have it share the same sort order as `A` (this requires no extra computational time since they can be built in a way which respects this sorting). Similarly let `Front_A` be the array of all `Front_a` and have it also share the same sort order as `A` and `Back_A` (again, with no extra time wasted sorting).

Use the diagram above, this would produce the following arrays,

* `Back_A = [[], [0], [0, 1], [0, 2], [0, 3], [4], [5], [5, 6]. [5, 6, 7]`
* `Front_A = [[1, 2, 3, 4], [2], [3], [4], [5], [6, 7, 8], [7, 8], [8], []]`

Step 3: Reduce each of the `Back_a` arrays into a new array `ReduceedBack_a` or `RBack_a` for short in the following way,
* `b` in `RBack_a` iff `b` in `Back_a` and there exists `d` in `Back_a` and `c` not in `Back_a` with `b < d < c < a` in the sort order.

Then let `RBack_A` be the array of all `RBack_a` sharing the same sort order as `A` (again, we can do this while respecting the sort order).

Pictorally (Diagram 2) resembles the following,

    +---------+
    |    0    |
    |         +---------+
    |         |    1    +---------+
    |         |         |    2    |
    |         |         |         |
    |         |         |         |
    |         +---------+         |
    |         |    3    |         |
    |         |         |         |
    |         |         +---------+
    +---------+         |    4    |
              |         |         |
    +---------+---------+         |
    |    5    |         |         |
    |         +---------+---------+
    |         |    6    +---------+---------+
    +---------+         |    7    |    8    |
              |         |         |         |
              +---------+         |         |
                        |         |         |
                        +---------+---------+

Using the diagram above, this would produce the following array

* `RBack_A = [[], [0], [0, 1], [0], [0, 3], [], [5], [5, 6], [5, 6, 7]]`

Step 4: Reduce each of the `Front_a` arrays in a new array `ReduceedFront_a` or `RFront_a` for short in the following way,
* If `RBack_a` is maximal (i.e. `RBack_a == Back_a`) then `Front_a` is not empty with `b` in `Front_a` such that the `RBack_b` has greater length than `RBack_a` then `b` is the first entry of the array `RFront_a`
* If `RBack_a` is not maximal, then we need to check both `Back_a` and `Front_a` for possible candidates to be the first entry of `RFront_a` (note that `RBack_a` and `RFront_a` will never share common values). This creates some subcases,
  * For each `b` in `Back_a` where `b` is not in `RBack_a` we must do the following,
    1. Initialize a value called `minRFront` with `null`.
    3. Expand `RFront_b`, this is done by taking the first entry `c` of `RFront_b` (calculated in the previous step) and then appending the first entry `d` of `RFront_c` to `Front_b` and so on. (Intuitively this is just taking the next value blocking the `c` and building the path out)
    3. Set `minRFront = minRFront || b`
    4. If `minRFront != b` and either
        1. `minRFront` appears in `RFront_b` OR
        2. `RBack_minRFront` is non-empty with a last value `c` and `c` is in `RFront_b` (`c` can be thought of as the linchpin, it blocks BOTH `b` and `a` in some sense).
    5. Return `minRFront` as the minimal possible candidate for the first value in `RFront_a`.
    6. If `Front_a` is non-empty with `c` in `Front_a` and `minRFront` is in `Back_c` then
        * If `RBack_c` has length less than `RBack_a`, set `minRFront` as the first value in `RFront_a`.
        * Else set `c` as the first value of `RFront_a`.
    7. Else set `minRFront` as the first value of `RFront_a`.
* Expand all the `RFront` arrays that were not expanded as part of the previous process.

I know this process seems complicated and is a bit hard to follow, but it's not computationally difficult and it can be optimized to run iteratively without any issue (see the exact code for confirmation, no recurssion is necessary).

Using (Diagram 2) as a reference we'd get,

* `RFront_A = [[1, 2], [2], [], [2], [], [4], [7], [8], []]`

Step 5: Now we have the graph `DAG_A`, however it is conveniently separated into the traversals,
* `Traversal_a = RBack_a + [a] + RFront_a`

So that `DAG_A == Traversal_A` if we continue the abuse of notation I incited since the beginning.

Pictorally (Diagram 3) gives us the following,

     0 ---> 1  --->  2  
     |
     |
     |
     v
     3  --->  4
              ^
              |
              |
              |
              5  --->  6  --->  7 ---> 8

Note that Step 5 is actually not a step, it's really more of a consideration, because we don't really do anything with `DAG_A`, we just need the traversals.

Step 6: Time to calculate the `w_a` and `x_a` values for each `a` in `A`. This is done in the following way,
* First set `w_a = 1` and `x_a = 0` for all `a` in `A`
* Sort the set of traversals `Traversal_A` into `Sorted_Traversal_A` by so the largest traversals come first. And again to save space, let `Traversal_A = Sorted_Traversal_A`.
* Iterate through each traversal `T_A` in `Traversal_A` using the aformentioned sort order,
    1. Initialize a variable `totalTraversalWidth = 0` which keeps track of how wide `T_A` is from the starting appointment.
    2. For each appointment `a_t` in `T_A` calculate `width` and `unset`
    3. `width` is the sum of all appointments `a_t` in the traversal where `w_a_t != 1`
    4. `unset` is the number of traversals `a_t` in the traversal where `w_a_t == 1`
    5. If `w_a_t == 1` then set `w_a_t = (1 - width) / Max(unset, 1)` and set `x_a_t = totalTraversalWidth`
    6. Add `w_a_t` to `totalTraversalWidth`

Using Diagram 2 as a reference this would produce the following widths and positions,
* `w_0 = 1/3, w_1 = 1/3, w_2 = 1/3, w_3 = 1/3, w_4 = 1/3, w_5 = 1/4, w_6 = 1/4, w_7 = 1/4, w_8 = 1/4`
* `x_0 = 0, x_1 = 1/3, x_2 = 2/3, x_3 = 1/3, x_4 = 2/3, x_5 = 0, x_6 = 1/4, x_7 = 1/2, x_8 = 3/4`

Pictorally (Diagram 4) shows the final result of the algorithm.

    +------------+
    |     0      |
    |            +------------+
    |            |     1      +------------+
    |            |            |     2      |
    |            |            |            |
    |            |            |            |
    |            +------------+            |
    |            |     3      |            |
    |            |            |            |
    |            |            +------------+
    +------------+            |     4      |
                 |            |            |
    +---------+  +------------+            |
    |    5    |               |            |
    |         +---------+     +------------+
    |         |    6    +---------+--------+       
    +---------+         |    7    |   8    |
              |         |         |        |
              +---------+         |        |
                        |         |        |
                        +---------+--------+

And that's it! Not too hard thanks to the sorting on `A` and the graph traversals of `DAG_A`.

More to come (namely specific implementation choices), you can examine the code first though if you don't feel like waiting ;)
