/*global window*/
(function () {
    'use strict';

    var fallbackStart = 0,
        fallbackDurationOrEnd = 1,
        unsetRBackMarker = -1,
        unsetDx = 1,
        unsetX = 0,
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
                return (appointment[tileParameters.start] || fallbackStart) + (appointment[tileParameters.delineator] || fallbackDurationOrEnd);
            }

            return appointment[tileParameters.delineator] || fallbackDurationOrEnd;
        },
        copyRelevantAppointmentData = function CalendarTiler_copyRelevantAppointmentData(appointmentsIn, tileParameters) {
            var i,
                appointments = [];

            for (i = appointmentsIn.length - 1; i >= 0; --i) {
                appointments.push({
                    index: i,
                    start: appointmentsIn[i][tileParameters.start] || fallbackStart,
                    end: getAppointmentEnd(appointmentsIn[i], tileParameters)
                });
            }

            return appointments.sort(sortAppointments);
        },
        constructDagTraversals = function CalendarTiler_constructDagTraversals(tiling) {
            var i,
                traversal,
                traversalKey,
                traversals = [],
                traversalMap = {};

            for (i = 0; i < tiling.rBack.length; ++i) {
                traversal = tiling.rBack[i].concat([i]).concat(tiling.rFront[i]);
                traversalKey = traversal.join('');

                if (!traversalMap[traversalKey]) {
                    traversalMap[traversalKey] = true;
                    traversals.push(traversal);
                }
            }

            traversals.sort(function (a, b) {
                return b.length - a.length;
            });

            return traversals;
        },
        calculateWidthsAndPositions = function CalendarTiler_calculateWidthsAndPositions(tiling) {
            var i,
                j,
                k,
                width,
                unset,
                traversal,
                traversals = constructDagTraversals(tiling),
                totalTraversalWidth;

            for (i = 0; i < traversals.length; ++i) {
                traversal = traversals[i];
                totalTraversalWidth = 0;

                for (j = 0; j < traversal.length; ++j) {
                    unset = 0;
                    width = 0;

                    for (k = 0; k < traversal.length; ++k) {
                        if (tiling.dx[traversal[k]] < 1) {
                            width += tiling.dx[traversal[k]];
                        } else {
                            ++unset;
                        }
                    }

                    if (tiling.dx[traversal[j]] === unsetDx) {
                        tiling.dx[traversal[j]] = (1 - width) / (unset || 1);
                        tiling.x[traversal[j]] = totalTraversalWidth;
                    }

                    totalTraversalWidth += tiling.dx[traversal[j]];
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

            calculateWidthsAndPositions(tiling);
        },
        sharesLinchPin = function CalendarTiler_sharesLinchPin(minFront, index, tiling) {
            var rBack = tiling.rBack[minFront],
                linchPin = rBack[rBack.length - 1];

            if (linchPin && getFirstIndexOf(linchPin, tiling.rFront[index]) > -1) {
                return true;
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

            while (getFirstIndexOf(unsetRBackMarker, tiling.rBack) > -1) {
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
                rBack: fillArrayWithInitialValues(numberOfAppointments, unsetRBackMarker),
                rFront: fillArrayWithInitialValues(numberOfAppointments),
                dx: fillArrayWithInitialValues(numberOfAppointments, unsetDx),
                x: fillArrayWithInitialValues(numberOfAppointments, unsetX)
            };
        },
        mapWidthsAndPositionsToOriginalAppointmentsOrder = function CalendarTiler_mapWidthsAndPositionsToOriginalAppointmentsOrder(tiling, appointments) {
            var i,
                dx = new Array(appointments.length),
                x = new Array(appointments.length);

            for (i = 0; i < appointments.length; ++i) {
                x[appointments[i].index] = tiling.x[i];
                dx[appointments[i].index] = tiling.dx[i];
            }

            return {
                x: x,
                dx: dx
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

            return mapWidthsAndPositionsToOriginalAppointmentsOrder(tiling, appointments);
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
