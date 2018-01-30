/*global window*/
(function () {
    'use strict';

    var startSentinel = 0,
        durationOrEndSentinel = 1,
        rBackSentinel = -1,
        dxSentinel = 1,
        xSentinel = 0,
        isString = function CalendarTiler_isString(value) {
            return typeof value === 'string' || value instanceof String;
        },
        isObject = function CalendarTiler_isObject(value) {
            return typeof value === 'object' || value instanceof Object;
        },
        isUndefined = function CalendarTiler_isUndefined(value) {
            return value === undefined;
        },
        sortAppointments = function CalendarTiler_sortAppointments(a, b) {
            return a.start - b.start || b.end - a.end;
        },
        getTail = function CalendarTiler_getTail(head, array) {
            var i;

            for (i = head + 1; i < array.length; ++i) {
                if (array[i] !== -1) {
                    return i;
                }
            }

            return array.length;
        },
        getFirstIndexOf = function CalendarTiler_getFirstIndexOf(val, array) {
            var i;

            for (i = 0; i < array.length; ++i) {
                if (array[i] === val) {
                    return i;
                }
            }

            return -1;
        },
        fillArrayWithInitialValues = function CalendarTiler_fillArrayWithInitialValues(numberOfAppointments, initialValue) {
            var i,
                array = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                array.push(isUndefined(initialValue) ? [] : initialValue);
            }

            return array;
        },
        mapTileParameters = function CalendarTiler_mapTileParameters(tileParametersIn) {
            var tileParameters = isObject(tileParametersIn) ? tileParametersIn : {};

            return {
                usesDuration: !!tileParameters.usesDuration,
                start: isString(tileParameters.start) ? tileParameters.start : 'start',
                delineator: isString(tileParameters.delineator) ? tileParameters.delineator : 'end'
            };
        },
        getAppointmentEnd = function CalendarTiler_getAppointmentEnd(appointment, tileParameters) {
            if (tileParameters.usesDuration) {
                return (appointment[tileParameters.start] || startSentinel) + (appointment[tileParameters.delineator] || durationOrEndSentinel);
            }

            return appointment[tileParameters.delineator] || durationOrEndSentinel;
        },
        copyRelevantAppointmentData = function CalendarTiler_copyRelevantAppointmentData(appointmentsIn, tileParameters) {
            var i,
                appointments = [];

            for (i = appointmentsIn.length - 1; i >= 0; --i) {
                appointments.push({
                    appointmentInIndex: i,
                    start: appointmentsIn[i][tileParameters.start] || startSentinel,
                    end: getAppointmentEnd(appointmentsIn[i], tileParameters)
                });
            }

            return appointments.sort(sortAppointments);
        },
        getNextVertexInTraversal = function CalendarTiler_getNextVertexInTraversal(tiling, currentVertex) {
            var i,
                lastRBackVertex,
                nextVertex = tiling.rFront[currentVertex][0],
                maximalRFrontLength = tiling.rFront[currentVertex].length;

            for (i = tiling.rFront.length - 1; i >= 0; --i) {
                lastRBackVertex = tiling.rBack[i][tiling.rBack[i].length - 1];

                if (lastRBackVertex === currentVertex && tiling.rFront[i].length > maximalRFrontLength) {
                    maximalRFrontLength = tiling.rFront[i].length;
                    nextVertex = i;
                }
            }

            return nextVertex;
        },
        getLongestTraversalThroughVertex = function CalendarTiler_getLongestTraversalThroughVertex(tiling, vertex) {
            var nextVertex,
                currentVertex = vertex,
                traversal = tiling.rBack[vertex].concat([vertex]);

            while(tiling.rFront[currentVertex].length > 0) {
                nextVertex = getNextVertexInTraversal(tiling, currentVertex);
                traversal.push(nextVertex);
                currentVertex = nextVertex;
            }

            return traversal;
        },
        constructDagTraversals = function CalendarTiler_constructDagTraversals(tiling) {
            var i,
                traversal,
                traversalKey,
                traversals = [],
                traversalMap = {};

            for (i = tiling.rBack.length - 1; i >= 0; --i) {
                traversal = getLongestTraversalThroughVertex(tiling, i, traversalMap);
                traversalKey = traversal.join();

                if (isUndefined(traversalMap[traversalKey])) {
                    traversalMap[traversalKey] = true;
                    traversals.push(traversal);
                }
            }

            traversals.sort(function (a, b) {
                return b.length - a.length;
            });

            return traversals;
        },
        calculateBlockingDx = function CalendarTiler_calculateBlockingDx(tiling, traversal, index, x) {
            var i,
                blockingVertexIndex = -1;

            for (i = index + 1; i < traversal.length; ++i) {
                if (tiling.x[traversal[i]] !== xSentinel) {
                    blockingVertexIndex = i;
                    break;
                }
            }

            return blockingVertexIndex > -1 ? ((tiling.x[traversal[blockingVertexIndex]] - x) / (blockingVertexIndex - index)) : undefined;
        },
        calculateNonBlockingDx = function CalendarTiler_calculateDx(tiling, traversal) {
            var i,
                unset = 0,
                dx = 0;

            for (i = 0; i < traversal.length; ++i) {
                if (tiling.dx[traversal[i]] < 1) {
                    dx += tiling.dx[traversal[i]];
                } else {
                    ++unset;
                }
            }

            return ((1 - dx) / (unset || 1));
        },
        setXAndDxValues = function CalendarTiler_setXAndDxValues(tiling, traversal, index) {
            var previousVertex = traversal[index - 1],
                x = isUndefined(previousVertex) ? 0 : (tiling.x[previousVertex] + tiling.dx[previousVertex]),
                dx = calculateBlockingDx(tiling, traversal, index, x);

            if (tiling.dx[traversal[index]] === dxSentinel) {
                tiling.x[traversal[index]] = x;
                tiling.dx[traversal[index]] = isUndefined(dx) ? calculateNonBlockingDx(tiling, traversal) : dx;
            }
        },
        calculateXAndDxValues = function CalendarTiler_calculateXAndDxValues(tiling) {
            var i,
                j,
                traversal,
                traversals = constructDagTraversals(tiling);

            for (i = 0; i < traversals.length; ++i) {
                traversal = traversals[i];

                for (j = 0; j < traversal.length; ++j) {
                    setXAndDxValues(tiling, traversal, j);
                }
            }

            return tiling;
        },
        expandRFront = function CalendarTiler_expandRFront(index, tiling) {
            if (tiling.rFront[index].length === 1) {
                var next = tiling.rFront[tiling.rFront[index][0]][0];

                while (next) {
                    tiling.rFront[index].push(next);
                    if (tiling.rFront[next].length > 0) {
                        next = tiling.rFront[next][0];
                    } else {
                        return;
                    }
                }
            }
        },
        expandRemainingRFront = function CalendarTiler_expandRemainingRFront(tiling) {
            var i;

            for (i = 0; i < tiling.rFront.length; ++i) {
                expandRFront(i, tiling);
            }

            calculateXAndDxValues(tiling);
        },
        sharesLinchPin = function CalendarTiler_sharesLinchPin(minFront, index, tiling) {
            var i,
                linchPin,
                rBack = tiling.rBack[minFront];

            for (i = rBack.length - 1; i >= 0; --i) {
                linchPin = rBack[i];

                if (getFirstIndexOf(linchPin, tiling.rFront[index]) > -1) {
                    return true;
                }
            }

            return false;
        },
        findNextRFrontFromBack = function CalendarTiler_findNextRFrontFromBack(index, tiling) {
            var i,
                back,
                minFront;

            for (i = 0; i < tiling.back[index].length; ++i) {
                back = tiling.back[index][i];

                if (getFirstIndexOf(back, tiling.rBack[index]) === -1) {
                    expandRFront(back, tiling);
                    minFront = minFront || back;

                    if (back !== minFront && (getFirstIndexOf(minFront, tiling.rFront[back]) > -1 || sharesLinchPin(minFront, back, tiling))) {
                        minFront = back;
                    }
                }
            }

            return minFront;
        },
        buildRFront = function CalendarTiler_buildRFront(tiling) {
            var i,
                next;

            for (i = 0; i < tiling.rFront.length; ++i) {
                if (tiling.back[i].length === tiling.rBack[i].length) {
                    if (tiling.front[i].length > 0 && tiling.rBack[tiling.front[i][0]].length > tiling.rBack[i].length) {
                        tiling.rFront[i].push(tiling.front[i][0]);
                    }
                } else {
                    next = next || findNextRFrontFromBack(i, tiling);

                    if (tiling.front[i].length > 0 && getFirstIndexOf(next, tiling.back[tiling.front[i][0]]) > -1) {
                        if (tiling.rBack[tiling.front[i][0]].length < tiling.rBack[i].length) {
                            tiling.rFront[i].push(next);
                            next = null;
                        } else {
                            tiling.rFront[i].push(tiling.front[i][0]);
                        }
                    } else {
                        tiling.rFront[i].push(next);
                        next = null;
                    }
                }
            }

            expandRemainingRFront(tiling);
        },
        buildRBack = function CalendarTiler_buildRBack(tiling) {
            var next,
                head,
                tail,
                path;

            while (getFirstIndexOf(rBackSentinel, tiling.rBack) > -1) {
                head = getFirstIndexOf(-1, tiling.rBack);
                tail = getTail(head, tiling.rBack);
                path = (head > 0 ? tiling.rBack[head - 1].concat([head - 1]) : []);

                while (head < tail) {
                    tiling.rBack[head] = path;
                    next = tiling.front[head][tiling.front[head].length - 1];
                    head = (next ? (next >= tail ? tail : next + 1) : head + 1);
                }
            }

            buildRFront(tiling);
        },
        generateTilingObject = function CalendarTiler_generateTilingObject(appointments) {
            var numberOfAppointments = appointments.length;

            return {
                front: fillArrayWithInitialValues(numberOfAppointments),
                back: fillArrayWithInitialValues(numberOfAppointments),
                rBack: fillArrayWithInitialValues(numberOfAppointments, rBackSentinel),
                rFront: fillArrayWithInitialValues(numberOfAppointments),
                dx: fillArrayWithInitialValues(numberOfAppointments, dxSentinel),
                x: fillArrayWithInitialValues(numberOfAppointments, xSentinel),
                y: fillArrayWithInitialValues(numberOfAppointments, startSentinel),
                dy: fillArrayWithInitialValues(numberOfAppointments, durationOrEndSentinel),
            };
        },
        finalizeTiling = function CalendarTiler_finalizeTiling(tiling, appointments, appointmentsIn) {
            var i,
                sortedAppointments = new Array(appointments.length);

            for (i = 0; i < appointments.length; ++i) {
                sortedAppointments[i] = appointmentsIn[appointments[i].appointmentInIndex];
                tiling.y[i] = appointments[i].start;
                tiling.dy[i] = appointments[i].end - appointments[i].start;
            }

            return {
                x: tiling.x,
                dx: tiling.dx,
                y: tiling.y,
                dy: tiling.dy,
                sortedAppointments: sortedAppointments
            };
        },
        tileAppointments = function CalendarTiler_tileAppointments(appointmentsIn, tileParameters) {
            var j,
                k,
                appointments = copyRelevantAppointmentData(appointmentsIn, tileParameters),
                tiling = generateTilingObject(appointments);

            if (appointments.length > 0) {
                for (j = 0; j < appointments.length; ++j) {
                    for (k = j + 1; k < appointments.length; ++k) {
                        if (appointments[k].start < appointments[j].end) {
                            tiling.front[j].push(k);
                        }
                    }

                    for (k = 0; k < j; ++k) {
                        if (appointments[k].end > appointments[j].start) {
                            tiling.back[j].push(k);
                        }
                    }
                }

                buildRBack(tiling);
            }

            return finalizeTiling(tiling, appointments, appointmentsIn);
        },
        calendarTiler = {
            tileAppointments: function CalendarTiler_initialize(appointmentsIn, tileParametersIn) {
                if (!Array.isArray(appointmentsIn)) {
                    throw 'calendarTiler.tileAppointments - 1st argument - appointmentsIn: expects an array.';
                }

                return tileAppointments(appointmentsIn,  mapTileParameters(tileParametersIn));
            }
        };

    window.calendarTiler = calendarTiler;
}());
