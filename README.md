# CalendarTiler
An algorithm for aesthetically displaying appointments/events on a calendar, currently implemented in JS (more languages to come)

# Why?
I wrote this for work (back around 3/16) because we needed a way to display a user's schedule for the day/week/whatever. I thought about the problem for a while and decided to approach it from what I viewed as the most aesthetically pleasing method to tile a calendar with a person's appointments/events/what-have-you.

# How? (Full length paper on the way along with demo code, TL;DR below)
The algorithm works by accepting an array of appointments `A` where each appointment `a` has a start value `s_a` and an end value `e_a`. In principal `s_a` can be any real valued number, however in practice `0 < s_a <= 24` is a typical use case. Also in principal `e_a`, can be any real valued number greater than `s_a` however in practice `s_a < e_a <= 24` is a typical use case. 

Given `A` we first sort in the following way, `a1 <= a2 iff s_a1 < s_a2 or (s_a1 == s_a2 and e_a1 >= e_a2)`
This means the appointments are first sorted by their start value in ascending fashion and subsequently sorted by their end value in descending fashion in the case of equal start values. We'll call the sorted array `S_A.

The goal of the algorithm is so that for each appointment `a in A` we assign it an ordered 4-tuple (i.e. a 4 dimensional vector) `t_a = (s_a, e_a, x_a, w_a)` where
* `s_a` is the start value
* `e_a` is the end value
* `x_a` is the horizontal value
* `w_a` is the width ... the choice of 'w' over 'y' was a tough one ;)

The set of values is returned as an array `T_A` in the sorted order as described above. This allows a person to 'draw' each apppointment (box) to the x-y plane (screen) as follows, `a` is rendered as the rectangle with coordinates (from upper-left, upper-right, lower-right, lower-left) in clockwise fashion, `{ (x_a, s_a), (x_a + w_a, s_a), (x_a + w_a, e_a), (x_a, e_a) }`

The width of the entire schedule period is presumed to be `1` so
* `0 <= x_a < 1` and `0 < w_a <= 1`

So how do we generate the `x_a` and `w_a` values? We construct a directed acyclic graph (DAG) `G_A` from the sorted input array `S_A`, the traversal orders of `G_A` produce the `x_a` values and the maximal traversal length through the given appointment `a` gives the associated width value `w_a`. Building `G_A` isn't too difficult (thanks to the initial sorting). More to come, you can examine the code first though if you don't feel like waiting ;)
