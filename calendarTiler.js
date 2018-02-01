/*global window*/
(function () {
    'use strict';

    var calendarTiler,
        startSentinel = 0,
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
        fillArray = function CalendarTiler_fillArray(numberOfAppointments, initialValue) {
            var i,
                array = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                array.push(isUndefined(initialValue) ? [] : initialValue);
            }

            return array;
        },
        getFirstIndexOf = function CalendarTiler_getFirstIndexOf(val, array) {
            var i;

            for (i = 0; i < array.length; ++i) {
                if (array[i] === val) {
                    return i;
                }
            }

            return -1;
        };

    function DirectedAcylicGraph(numberOrVertices) {
        var dag = this,
            edges = fillArray(numberOrVertices),
            topologicalOrdering = [],
            visitVertex = function DirectedAcylicGraph_visitVertex(vertex,  visitedVertices) {
                var i,
                    edgeSet = edges[vertex];

                visitedVertices[vertex] = true;

                for (i = 0; i < edgeSet.length; ++i) {
                    if (!visitedVertices[edgeSet[i]]) {
                        visitVertex(edgeSet[i], visitedVertices);
                    }
                }

                topologicalOrdering.push(vertex);
            },
            topologicalSort = function DirectedAcylicGraph_topologicalSort() {
                var i,
                    visitedVertices = fillArray(numberOrVertices, false);

                for (i = 0; i < numberOrVertices; ++i) {
                    if (visitedVertices[i] == false) {
                        visitVertex(i, visitedVertices);
                    }
                }
            };

        dag.addEdge = function DirectedAcylicGraph_addEdge(fromVertex, toVertex) {
            if (getFirstIndexOf(toVertex, edges[fromVertex]) === -1) {
                edges[fromVertex].push(toVertex);
            }
        };

        dag.getLongestPathThroughVertex = function DirectedAcylicGraph_getLongestPathThroughVertex(vertex) {
            var i,
                j,
                fromVertex,
                toVertex,
                longestPathLength = -1,
                longestPathIndex = -1,
                longestPath = [],
                incomingVertices = fillArray(numberOrVertices, null),
                paths = fillArray(numberOrVertices, -1);

            if (topologicalOrdering.length === 0) {
                topologicalSort();
            }

            paths[vertex] = 0;

            for (i = topologicalOrdering.length - 1; i >= 0; --i) {
                fromVertex = topologicalOrdering[i];

                if (paths[fromVertex] !== -1) {
                    for (j = 0; j < edges[fromVertex].length; ++j) {
                        toVertex = edges[fromVertex][j];

                        if (paths[toVertex] <= paths[fromVertex]) {
                            paths[toVertex] = paths[fromVertex] + 1;
                            incomingVertices[toVertex] = fromVertex;
                        }
                    }
                }
            }

            for (i = paths.length - 1; i >= 0; --i) {
                if (paths[i] >= longestPathLength) {
                    longestPathLength = paths[i];
                    longestPathIndex = i;
                }
            }

            if (longestPathIndex > -1) {
                longestPath.push(longestPathIndex);

                for (i = 0; i < longestPathLength; ++i) {
                    longestPath.push(incomingVertices[longestPathIndex]);
                    longestPathIndex = incomingVertices[longestPathIndex];
                }
            }

            longestPath.pop();

            return longestPath;
        };
    }

    calendarTiler = {
        sortAppointments: function CalendarTiler_sortAppointments(a, b) {
            return a.start - b.start || b.end - a.end;
        },
        getTail: function CalendarTiler_getTail(head, array) {
            var i;

            for (i = head + 1; i < array.length; ++i) {
                if (array[i] !== rBackSentinel) {
                    return i;
                }
            }

            return array.length;
        },
        mapTileParameters: function CalendarTiler_mapTileParameters(tileParametersIn) {
            var tileParameters = isObject(tileParametersIn) ? tileParametersIn : {};

            return {
                usesDuration: !!tileParameters.usesDuration,
                start: isString(tileParameters.start) ? tileParameters.start : 'start',
                delineator: isString(tileParameters.delineator) ? tileParameters.delineator : 'end'
            };
        },
        getAppointmentEnd: function CalendarTiler_getAppointmentEnd(appointment, tileParameters) {
            if (tileParameters.usesDuration) {
                return (appointment[tileParameters.start] || startSentinel) + (appointment[tileParameters.delineator] || durationOrEndSentinel);
            }

            return appointment[tileParameters.delineator] || durationOrEndSentinel;
        },
        copyRelevantAppointmentData: function CalendarTiler_copyRelevantAppointmentData(appointmentsIn, tileParameters) {
            var i,
                appointments = [];

            for (i = appointmentsIn.length - 1; i >= 0; --i) {
                appointments.push({
                    appointmentInIndex: i,
                    start: appointmentsIn[i][tileParameters.start] || startSentinel,
                    end: calendarTiler.getAppointmentEnd(appointmentsIn[i], tileParameters)
                });
            }

            return appointments.sort(calendarTiler.sortAppointments);
        },
        calculateBlockingDx: function CalendarTiler_calculateBlockingDx(tiling, path, index, x) {
            var i,
                blockingVertexIndex = -1;

            for (i = index + 1; i < path.length; ++i) {
                if (tiling.x[path[i]] !== xSentinel) {
                    blockingVertexIndex = i;
                    break;
                }
            }

            return blockingVertexIndex > -1 ? ((tiling.x[path[blockingVertexIndex]] - x) / (blockingVertexIndex - index)) : undefined;
        },
        calculateNonBlockingDx: function CalendarTiler_calculateDx(tiling, path) {
            var i,
                unset = 0,
                dx = 0;

            for (i = 0; i < path.length; ++i) {
                if (tiling.dx[path[i]] < dxSentinel) {
                    dx += tiling.dx[path[i]];
                } else {
                    ++unset;
                }
            }

            return ((1 - dx) / (unset || 1));
        },
        setXAndDxValues: function CalendarTiler_setXAndDxValues(tiling, path, index) {
            var previousVertex = path[index - 1],
                x = isUndefined(previousVertex) ? 0 : (tiling.x[previousVertex] + tiling.dx[previousVertex]),
                dx = calendarTiler.calculateBlockingDx(tiling, path, index, x);

            if (tiling.dx[path[index]] === dxSentinel) {
                tiling.x[path[index]] = x;
                tiling.dx[path[index]] = isUndefined(dx) ? calendarTiler.calculateNonBlockingDx(tiling, path) : dx;
            }
        },
        calculateXAndDxValues: function CalendarTiler_calculateXAndDxValues(tiling, paths) {
            var i,
                j;

            for (i = 0; i < paths.length; ++i) {
                for (j = 0; j < paths[i].length; ++j) {
                    calendarTiler.setXAndDxValues(tiling, paths[i], j);
                }
            }

            return tiling;
        },
        addVertexEdgeToDirectedAcyclicGraphs: function CalendarTiler_addVertexEdgeToDirectedAcyclicGraphs(tiling, forwardDag, backwardDag, fromVertex, toVertex) {
            if (tiling.rBack[toVertex][tiling.rBack[toVertex].length - 1] === fromVertex) {
                forwardDag.addEdge(fromVertex, toVertex);
            }

            if (tiling.rFront[toVertex][0] === fromVertex) {
                backwardDag.addEdge(fromVertex, toVertex);
            }
        },
        addEVertexEdgesToDirectedAcyclicGraphs: function CalendarTiler_addEVertexEdgesToDirectedAcyclicGraphs(tiling, forwardDag, backwardDag, fromVertex) {
            var i;

            if (tiling.rFront[fromVertex].length > 0) {
                forwardDag.addEdge(fromVertex, tiling.rFront[fromVertex][0]);
            }

            if (tiling.rBack[fromVertex].length > 0) {
                backwardDag.addEdge(fromVertex, tiling.rBack[fromVertex][tiling.rBack[fromVertex].length - 1]);
            }

            for (i = tiling.rBack.length - 1; i > fromVertex; --i) {
                calendarTiler.addVertexEdgeToDirectedAcyclicGraphs(tiling, forwardDag, backwardDag, fromVertex, i);
            }

            for (i = fromVertex - 1; i >= 0; --i) {
                calendarTiler.addVertexEdgeToDirectedAcyclicGraphs(tiling, forwardDag, backwardDag, fromVertex, i);
            }
        },
        concatenateDirectedAcylicGraphPaths: function CalendarTiler_concatenateDirectedAcylicGraphPaths(tiling, forwardDag, backwardDag) {
            var i,
                path,
                pathKey,
                pathMap = {},
                longestPathThroughVertex = [];

            for (i = 0; i < tiling.rFront.length; ++i) {
                path = backwardDag.getLongestPathThroughVertex(i).concat([i]).concat(forwardDag.getLongestPathThroughVertex(i).reverse());
                pathKey = path.join();

                if (isUndefined(pathMap[pathKey])) {
                    pathMap[pathKey] = true;
                    longestPathThroughVertex.push(path);
                }
            }

            return longestPathThroughVertex;
        },
        buildDirectedAcyclicGraphs: function CalendarTiler_buildDirectedAcyclicGraphs(tiling) {
            var i,
                paths,
                forwardDag = new DirectedAcylicGraph(tiling.rFront.length),
                backwardDag = new DirectedAcylicGraph(tiling.rFront.length);

            for (i = 0; i < tiling.rFront.length; ++i) {
                calendarTiler.addEVertexEdgesToDirectedAcyclicGraphs(tiling, forwardDag, backwardDag, i);
            }

            paths = calendarTiler.concatenateDirectedAcylicGraphPaths(tiling, forwardDag, backwardDag);

            paths.sort(function (a, b) {
                return b.length - a.length;
            });

            calendarTiler.calculateXAndDxValues(tiling, paths);
        },
        expandRFront: function CalendarTiler_expandRFront(index, tiling) {
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
        expandRemainingRFront: function CalendarTiler_expandRemainingRFront(tiling) {
            var i;

            for (i = 0; i < tiling.rFront.length; ++i) {
                calendarTiler.expandRFront(i, tiling);
            }

            calendarTiler.buildDirectedAcyclicGraphs(tiling);
        },
        sharesLinchPin: function CalendarTiler_sharesLinchPin(minFront, index, tiling) {
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
        findNextRFrontFromBack: function CalendarTiler_findNextRFrontFromBack(index, tiling) {
            var i,
                back,
                minFront;

            for (i = 0; i < tiling.back[index].length; ++i) {
                back = tiling.back[index][i];

                if (getFirstIndexOf(back, tiling.rBack[index]) === -1) {
                    calendarTiler.expandRFront(back, tiling);
                    minFront = minFront || back;

                    if (back !== minFront && (getFirstIndexOf(minFront, tiling.rFront[back]) > -1 || calendarTiler.sharesLinchPin(minFront, back, tiling))) {
                        minFront = back;
                    }
                }
            }

            return minFront;
        },
        buildRFront: function CalendarTiler_buildRFront(tiling) {
            var i,
                next;

            for (i = 0; i < tiling.rFront.length; ++i) {
                if (tiling.back[i].length === tiling.rBack[i].length) {
                    if (tiling.front[i].length > 0 && tiling.rBack[tiling.front[i][0]].length > tiling.rBack[i].length) {
                        tiling.rFront[i].push(tiling.front[i][0]);
                    }
                } else {
                    next = next || calendarTiler.findNextRFrontFromBack(i, tiling);

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

            calendarTiler.expandRemainingRFront(tiling);
        },
        buildRBack: function CalendarTiler_buildRBack(tiling) {
            var next,
                head,
                tail,
                path;

            while (getFirstIndexOf(rBackSentinel, tiling.rBack) > -1) {
                head = getFirstIndexOf(-1, tiling.rBack);
                tail = calendarTiler.getTail(head, tiling.rBack);
                path = (head > 0 ? tiling.rBack[head - 1].concat([head - 1]) : []);

                while (head < tail) {
                    tiling.rBack[head] = path;
                    next = tiling.front[head][tiling.front[head].length - 1];
                    head = (next ? (next >= tail ? tail : next + 1) : head + 1);
                }
            }

            calendarTiler.buildRFront(tiling);
        },
        generateTilingObject: function CalendarTiler_generateTilingObject(appointments) {
            var numberOfAppointments = appointments.length;

            return {
                front: fillArray(numberOfAppointments),
                back: fillArray(numberOfAppointments),
                rBack: fillArray(numberOfAppointments, rBackSentinel),
                rFront: fillArray(numberOfAppointments),
                dx: fillArray(numberOfAppointments, dxSentinel),
                x: fillArray(numberOfAppointments, xSentinel),
                y: fillArray(numberOfAppointments, startSentinel),
                dy: fillArray(numberOfAppointments, durationOrEndSentinel)
            };
        },
        finalizeTiling: function CalendarTiler_finalizeTiling(tiling, appointments, appointmentsIn) {
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
        tileAppointments: function CalendarTiler_tileAppointments(appointmentsIn, tileParametersIn) {
            var j,
                k,
                tileParameters =  calendarTiler.mapTileParameters(tileParametersIn),
                appointments = calendarTiler.copyRelevantAppointmentData(appointmentsIn, tileParameters),
                tiling = calendarTiler.generateTilingObject(appointments);

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

                calendarTiler.buildRBack(tiling);
            }

            return calendarTiler.finalizeTiling(tiling, appointments, appointmentsIn);
        }
    };

    window.calendarTiler = {
        tileAppointments: function CalendarTiler_initialize(appointmentsIn, tileParametersIn) {
            if (!Array.isArray(appointmentsIn)) {
                throw 'calendarTiler.tileAppointments - 1st argument - appointmentsIn: expects an array.';
            }

            return calendarTiler.tileAppointments(appointmentsIn, tileParametersIn);
        }
    };
}());
