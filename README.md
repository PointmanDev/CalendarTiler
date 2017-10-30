# CalendarTiler
An algorithm for aesthetically displaying appointments/events on a calendar, currently implemented in JS (more languages to come)

# Why?
I wrote this for work (back around 3/16) because we needed a way to display a user's schedule for the day/week/whatever. I thought about the problem for a while and decided to approach it from what I viewed as the most aesthetically pleasing method to tile a calendar with a person's appointments/events/what-have-you.

# How? (Full length paper on the way along with demo code, TL;DR below)
The algorithm works by accepting an array of appointments `A` where each appointment `a` has a start value `s_a` and an end value `e_a`. In principal `s_a` can be any real valued number, however in practice `0 < s_a <= 24` is a typical use case. Also in principal `e_a`, can be any real valued number greater than `s_a` however in practice `s_a < e_a <= 24` is a typical use case. 

Given `A` we first sort in the following way,
* `a1 <= a2 iff s_a1 < s_a2 or (s_a1 == s_a2 and e_a1 >= e_a2)`
This means the appointments are first sorted by their start value in ascending fashion and subsequently sorted by their end value in descending fashion in the case of equal start values. We'll call the sorted array `S_A`.

The goal of the algorithm is so that for each appointment `a in A` we assign it an ordered 4-tuple (i.e. a 4 dimensional vector) `t_a = (s_a, e_a, x_a, w_a)` where
* `s_a` is the start value
* `e_a` is the end value
* `x_a` is the horizontal value
* `w_a` is the width ... the choice of 'w' over 'y' was a tough one ;)

The set of values is returned as an array `T_A` in the sorted order as described above. This allows a person to 'draw' each apppointment (box) to the x-y plane (screen) as follows, `a` is rendered as the rectangle with coordinates (from upper+eft, upper-right, lower-right, lower+eft) in clockwise fashion, `{ (x_a, s_a), (x_a + w_a, s_a), (x_a + w_a, e_a), (x_a, e_a) }`

The width of the entire schedule period is normalized to be `1` so that
* `0 <= x_a < 1` and `0 < w_a <= 1`

So how do we generate the `x_a` and `w_a` values? We construct a directed acyclic graph (DAG) `G_A` from the sorted input array `S_A`, the traversal lengths of `G_A` produce the `w_a` values, and `x_a` can be computed from summing the `w_a` in the paths.

# The Algorithm
Step 1: Sort `A` into `S_A`.

Step 2: Generate the a list of paths, `tB_A` for each `a`, where `tB_A` is the "Transformed Back" of each appointment `a`, essentially these are all the appointments that come before `a` in the sorting that "block" `a` from being moved farthest to the left. So for `a` let `tB_a` be the already sorted list of appointments `b` where `s_b < e_a`. Then `tB_A` is the list of all `tB_a` which retains the sorted order of `S_A`. This is easy to visualize pictorially, (assume all widths are equal to 1 until set in a later step)

    +---------+
    |    1    |
    |         +----------+
    |         |     2    |
    |         |          |
    |         |          |
    |         |          |
    +---------+----------+----------+
                         |     3    |
                         |          |
                         |          +----------+
                         |          |     4    |
                         |          |          |
                         +----------+          +----------+
                                    |          |     5    |
                                    +----------+          +----------+
                                               |          |     6    |----------+
                                               +----------+          |     7    |
                                                          |          |          |
                                                          +----------+          |
                                                                     |          |
                                                                     +----------+
becomes

    +---------+
    |    1    |
    |         +----------+
    |         |     2    |
    |         |          |
    |         |          |
    |         |          |
    +---------+----------+
    |    3    |
    |         |
    |         +----------+
    |         |     4    |
    |         |          |
    +---------+          |
    |    5    |          |
    |         +----------+
    |         |     6    +----------+
    +---------+          |     7    |
              |          |          |
              +----------+          |
                         |          |
                         +----------+
          
So `tB_1 = {}, tB_2 = {1}, tB_3 = {}, tB_4 = {3}, tB_5 = {}, tB_6 = {5} and tB_7 = {5, 6}`

Step 3: Generate a list of paths, `tF_A` for each `a` where `tF_A` is the "Transformed Front" of each appointment `a`, essentially these are the all appointments that come after `a` in the sorting that "block" `a` from moving to the right. This list is slightly more complicated to describe mathematically because it depends on the way `tB_A` turns out, if you look below you'll see that they might defy intuition slightly. Essentially we start by taking the "first" appointment `b` which prevents `a` from being moved to the right, and then iteratively build the rest of the list by adding the appointments in `tF_b` to `tF_a`. This means that the `tF_*` lists will have the form {`b`} concatenated `tF_b` (if such a `b` exists, otherwise it will be `{}`). Fortunately the process to generate `tF_A` is still an iterative process and does not significantly impact the runtime.

So `tF_1 = {2}, tB_2 = {}, tB_3 = {4}, tB_4 = {}, tB_5 = {4}, tB_6 = {7} and tB_7 = {}`

Step 4: Now we have the DAG `G_A`, just separated into the appointments before a given appointment and the appoints after a given appointment. So from the above picture the graph `G_A` would look like,

     1  --->  2  

     3  --->  4 
              ^
       _______|
      /
     5  --->  6  --->  7 

To calculate the widths `w_a` we set `w_a = 1` for all `a` in `S_A` then we iterate through the sorted list `S_A` and take `w_a = 1 / (SUM(w_tB_a) + SUM(w_tF_a) + 1)`

(Note here, the `1` in the denominator of the equation comes from `a` itself)

Intuitively this is the sum of all the widths in the "tranformed" traversal path. So as we get further into the sorting more of the `w_a` have assigned values that are not 1. This allows the earlier appointments to get precedence in how their widths are set and subsequently influence later appointments into fitting into the more confined spaces. Thus it's easy to see that,

`w_1 = 1/2, w_2 = 1/2, w_3 = 1/2, w_4 = 1/2, w_5 = 1/2, w_6 = 1/4 and w_6 = 1/4`

Step 5: Finally to determine the `x_a` for each `a` in `A`, `x_a` is simply the sum of all `w_b` for each`b` in `tB_a`. This gives us the final picture,

    +-------+
    |   1   |
    |       +-------+
    |       |   2   |
    |       |       |
    |       |       |
    |       |       |
    +-------+-------+
    |   3   |
    |       |
    |       +-------+
    |       |   4   |
    |       |       |
    +------+        |
    |   5   |       |
    |       +---+---+
    |       | 6 +---+
    +-------+   | 7 |
            |   |   |
            +---+   |
                |   |
                +---+

And that's it! Not too hard thanks to the sorting of `S_A` and the nice properties of the DAG `G_A`

More to come (namely specific implementation choices), you can examine the code first though if you don't feel like waiting ;)
