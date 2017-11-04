# CalendarTiler
An algorithm for aesthetically displaying appointments/events on a calendar, currently implemented in JS (more languages to come).

# Why?
At work (https://fieldnimble.com/) we needed a way to display the calendars of many users all at once and have the appointments/visits/events/what-have-you in a clean aesthetically pleasing way. So I designed this method and implemented it in JS (my desk was covered in scratch pad paper with little boxes drawn all over them for about 2 weeks, fun times).

# How?
The algorithm works by accepting an array of appointments `A` as an input, where each appointment `a` has a start value `s_a` and an end value `e_a`. In principal `s_a` and `e_a` can be any real valued numbers with `s_a < e_a` (however `0 < s_a < e_a <= 24` is a typical use case).

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

# The Algorithm
Step 1: Sort `A` into a new array `Sorted_A` by the following rule,
* `a <= b iff s_a < s_b or (s_a == s_b and e_a >= e_b)` for `a` and `b` in `A`
This sorting simply means that appointments are sorted in ascending fashion by start time and then in descending fashion by end time should they have equal start times. From now on we'll just assume that `A` is sorted as above so I don't need to keep typing `Sorted_A`.

Pictorally (Diagram 1) of this would resemble the following,

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

Step 3: Transform each of the `Back_a` arrays into a new array `TransformedBack_a` or `TBack_a` for short in the following way,
* `b` in `TBack_a` iff `b` in `Back_a` and there exists `d` in `Back_a` and `c` not in `Back_a` with `b < d < c < a` in the sort order.

Then let `TBack_A` be the array of all `TBack_a` sharing the same sort order as `A` (again, we can do this while respecting the sort order).

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

*`TBack_A = [[], [0], [0, 1], [0], [0, 3], [], [5], [5, 6], [5, 6, 7]]`

Step 4: Transform each of the `Front_a` arrays in a new array `TransformedFront_a` or `TFront_a` for short in the following way,
* If `TBack_a` is maximal (i.e. `TBack_a == Back_a`) then `Front_a` is not empty with `b` in `Front_a` such that the `TBack_b` has greater length than `TBack_a` then `b` is the first entry of the array `TFront_a`
* If `TBack_a` is not maximal, then we need to check both `Back_a` and `Front_a` for possible candidates to be the first entry of `TFront_a` (note that `TBack_a` and `TFront_a` will never share common values). This creates some subcases,
  * For each `b` in `Back_a` where `b` is not in `TBack_a` we must do the following, 
    1. Initialize a value called `minTFront` with `null`.
    3. Expand `TFront_b`, this is done by taking the first entry `c` of `TFront_b` (calculated in the previous step) and then appending the first entry `d` of `TFront_c` to `Front_b` and so on. (Intuitively this is just taking the next value blocking the `c` and building the path out)
    3. Set `minTFront = minTFront || b`
    4. If `minTFront != b` and either
        1. `minTFront` appears in `TFront_b` OR
        2. `TBack_minTFront` is non-empty with a last value `c` and `c` is in `TFront_b` (`c` can be thought of as the linchpin, it blocks BOTH `b` and `a` in some sense).
    5. Return `minTFront` as the minimal possible candidate for the first value in `TFront_a`.
    6. If `Front_a` is non-empty with `c` in `Front_a` and `minTFront` is in `Back_c` then
      * If `TBack_c` has length less than `TBack_a`, set `minTFront` as the first value in `TFront_a`.
      * Else set `c` as the first value of `TFront_a`.
    7. Else set `minTFront` as the first value of `TFront_a`.
  * Expand all the `TFront` arrays that were not expanded as part of the previous process.

I know this process seems complicated and is a bit hard to follow, but it's not computationally difficult and it can be optimized to run iteratively without any issue (see the exact code for confirmation, no recurssion is necessary).

Using (Diagram 2) as a reference we'd get,

* `TFront_A = [[1, 2], [2], [], [2], [], [4], [7], [8], []]`

Step 5: Now we have the graph `DAG_A`, however it is conveniently separated into the traversals,
* `Traversal_a = TBack_a + [a] + TFront_a`

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
     
Note that Step 5 is actually not a step, it's really more of a consideration, because we really don't care about `DAG_A`, just the traversals (Philosophically speaking I guess this means we do care about `DAG_A` though).

Step 6: Time to calculate the `w_a` values for each `a` in `A`. This is done in the following way,
* First set `w_a = 1` for all `a` in `A`
* Iterate through `A` using the sort order
    1. If `TBack_a` is empty then set `w_b = 1 / Length(Traversal_A)` for all `b` in `Traversal_A` (note this includes `w_a`).
    2. Find `Traversal_b` which includes `a` and is the traversal with the longest length then
        * Set `width = SUM w_c` where `c` in `Traversal_b` and `c < 1`
        * Set `unset = SUM w_c` where `c` in `Traversal_b` and `c == 1`
        * `w_a = (1 - width / unset)

Using Diagram 2 as a reference this would produce the following widths,
* `w_0 = 1/3, w_1 = 1/3, w_2 = 1/3, w_3 = 1/3, w_4 = 1/3, w_5 = 2/3, w_6 = 1/6, w_7 = 1/6, w_8 = 1/6`

Step 6: Finally to determine the `x_a` for each `a` in `A`, `x_a` is simply the sum of all `w_b` for each`b` in `TBack_a`.

Pictorally (Diagram 4) shows the final result of the algorithm.

    +-----------+
    |     0     |
    |           +-----------+
    |           |     1     +-----------+
    |           |           |     2     |
    |           |           |           |
    |           |           |           |
    |           +-----------+           |
    |           |     3     |           |
    |           |           |           |
    |           |           +-----------+
    +-----------+           |     4     |
                |           |           |
    +-----------+-----------+           |
    |           5           |           |
    |                       +---+-------+
    |                       | 6 +---+---+
    +-----------------------+   | 7 | 8 |
                            |   |   |   |
                            +---+   |   |
                                |   |   |
                                +---+---+

And that's it! Not too hard thanks to the sorting on `A` and the nice properties of the DAG `DAG_A`.

More to come (namely specific implementation choices), you can examine the code first though if you don't feel like waiting ;)
