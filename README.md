# CalendarTiler
An algorithm for aesthetically displaying appointments/events on a calendar, currently implemented in JS (more languages to come)

# Why?
I wrote this for work (back around 3/16) because we needed a way to display a user's schedule for the day/week/whatever. I thought about the problem for a while and decided to approach it from what I viewed as the most aesthetically pleasing method to tile a calendar with a person's appointments/events/what-have-you.

# How? (Full length paper on the way along with demo code, TL;DR below)
Full disclosure, this is the first README I've ever written on GitHUb and I thought the markup was Wiki markup so that's why everything looks terrible :(

The algorithm works by accepting an array of appointments (<math>A</math>) where each appointment (<math>a</math>) has a start value (<math>s_a</math>) and an end value (<math>e_a</math>). In principal <math>s_a</math> can be any real valued number, however in practice
:<math>0 \le s_a le 24</math>
will be a typical use case. In principal <math>e_a</math>, can be any real valued number greater than <math>s_a</math> however in practice
:<math>s_a \lt e_a \le 24</math>
will be a typical use case. Given <math>A</math> we sort the <math>a</math> in the following way,
:<math>a_1 \le a_2 \iff s_{a_1} \le s_{a_2} and e_{a_1} \ge e_{a_2}</math>
This means the appointments are first sorted by their start value in ascending fashion and subsequently sorted by their end value in descending fashion in the case of equal start values. The goal of the algorithm is so that for each appointment <math>a</math> in <math>A</math> we assign it an ordered 4-tuple (i.e. a 4 dimensional vector) <math>t_a = (s_a, e_a, x_a, w_a)</math> where
:<math>s_a</math> is the start value of <math>a</math>
:<math>e_a</math> is the end value of <math>a</math>
:<math>x_a</math> is the horizontal value of <math>a</math>
:<math>w_a</math> is the width of the appointment of <math>a</math> - the choice of 'w' over 'y' was a tough one ;)
The set of values is returned as an array <math>T_A</math> in the sorted order as described above. This allows a person to 'draw' each apppointment (box) to the x-y plane (screen) as follows, <math>a</math> is rendered as the rectangle with coordinates (from upper-left, upper-right, lower-right, lower-left) in clockwise fashion,
:<math>\{ (x_a, s_a), (x_a + w_a, s_a), (x_a + w_a, e_a), (x_a, e_a) \}<\math>
The width of the entire schedule period is presumed to be <math>1</math> so
:<math>0 \le x_a \lt 1<\math>
and
:<math>0 \lt w_a \le 1<math>
So how do we generate the <math>x_a</math> and <math>w_a</math> values? Well we construct a directed acyclic graph (DAG) <math>G_A</math> from the sorted input array <math>A</math>, the traversal orders of <math>G_A<\math> produce the <math>x_a</math> values and the maximal traversal length through the given appointment <math>a</math> gives the associated width values <math>w_a</math>. Building <math>G_A</math> isn't too difficult (thanks to the initial sorting of <math>A</math>). More to come, you can examine the code first though if you don't feel like waiting ;)
