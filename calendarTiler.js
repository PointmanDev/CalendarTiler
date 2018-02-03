/*global window*/
(function () {
    'use strict';

    var calendarTiler,
        unsetIndexSentinel = -1,
        startSentinel = 0,
        xSentinel = 0,
        durationOrEndSentinel = 1,
        dxSentinel = 1,
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

            return unsetIndexSentinel;
        },
        reverseArray = function CalendarTiler_reverseArray(array) {
            var left,
                right,
                temp,
                length = array.length;

            for (left = 0; left < length / 2; ++left)
            {
                right = length - 1 - left;
                temp = array[left];
                array[left] = array[right];
                array[right] = temp;
            }

            return array;
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
                    if (visitedVertices[i] === false) {
                        visitVertex(i, visitedVertices);
                    }
                }
            },
            buildPathsThroughVertex = function DirectedAcylicGraph_buildPathsThroughVertex(vertex, incomingVertices) {
                var i,
                    j,
                    fromVertex,
                    toVertex,
                    paths = fillArray(numberOrVertices, unsetIndexSentinel);

                if (topologicalOrdering.length === 0) {
                    topologicalSort();
                }

                paths[vertex] = 0;

                for (i = topologicalOrdering.length - 1; i >= 0; --i) {
                    fromVertex = topologicalOrdering[i];

                    if (paths[fromVertex] !== unsetIndexSentinel) {
                        for (j = 0; j < edges[fromVertex].length; ++j) {
                            toVertex = edges[fromVertex][j];

                            if (paths[toVertex] <= paths[fromVertex]) {
                                paths[toVertex] = paths[fromVertex] + 1;
                                incomingVertices[toVertex] = fromVertex;
                            }
                        }
                    }
                }

                return paths;
            };

        dag.addEdge = function DirectedAcylicGraph_addEdge(fromVertex, toVertex) {
            if (getFirstIndexOf(toVertex, edges[fromVertex]) === unsetIndexSentinel) {
                edges[fromVertex].push(toVertex);

                if ( topologicalOrdering.length > 0) {
                    topologicalOrdering = [];
                }
            }
        };

        dag.getLongestPathThroughVertex = function DirectedAcylicGraph_getLongestPathThroughVertex(vertex) {
            var i,
                longestPathLength = unsetIndexSentinel,
                longestPathIndex = unsetIndexSentinel,
                incomingVertices = fillArray(numberOrVertices, null),
                paths = buildPathsThroughVertex(vertex, incomingVertices),
                longestPath = [];


            for (i = paths.length - 1; i >= 0; --i) {
                if (paths[i] >= longestPathLength) {
                    longestPathLength = paths[i];
                    longestPathIndex = i;
                }
            }

            if (longestPathIndex > unsetIndexSentinel) {
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

            appointments.sort(calendarTiler.sortAppointments);

            for (i = appointments.length - 1; i >= 0; --i) {
                appointments[i].sortedIndex = i;
            }

            return appointments;
        },
        doAppointmentsCollide: function CalendarTiler_doAppointmentsCollide(appointmentA, appointmentB, inReverse) {
            var earlierAppointment = inReverse ? appointmentB : appointmentA,
                laterAppointment = inReverse ? appointmentA : appointmentB;

            if (!inReverse && laterAppointment.start >= earlierAppointment.end) {
                return undefined;
            }

            if (inReverse && earlierAppointment.start >= laterAppointment.end) {
                return undefined;
            }

            if (earlierAppointment.start === laterAppointment.start
                    || earlierAppointment.end === laterAppointment.end
                    || (earlierAppointment.start < laterAppointment.start && earlierAppointment.end > laterAppointment.start)
                    || (earlierAppointment.start > laterAppointment.start && earlierAppointment.start < laterAppointment.end)) {
                return inReverse ? earlierAppointment.sortedIndex : laterAppointment.sortedIndex;
            }

            return -1;
        },
        collideAppointmentIntoColumn: function CalendarTiler_collideAppointmentIntoColumn(column, appointment, inReverse) {
            var i,
                collisionIndex,
                toVertices = [];

            for (i = 0; i < column.length; ++i) {
                collisionIndex = calendarTiler.doAppointmentsCollide(appointment, column[i], inReverse);

                if (collisionIndex > -1) {
                    toVertices.push(collisionIndex);
                } else if (isUndefined(collisionIndex)) {
                    return toVertices.length > 0 ? toVertices : undefined;
                }
            }

            return toVertices.length > 0 ? toVertices : undefined;
        },
        getDirectedAcyclicGraphForwardVertices: function CalendarTiler_getDirectedAcyclicGraphForwardVertices(columns, appointment, columnIndex) {
            var i,
                toVertices;

            for (i = columnIndex + 1; i < columns.length; ++i) {
                toVertices = calendarTiler.collideAppointmentIntoColumn(columns[i], appointment);

                if (Array.isArray(toVertices)) {
                    return toVertices;
                }
            }

            return [];
        },
        getDirectedAcyclicGraphBackwardVertices: function CalendarTiler_getDirectedAcyclicGraphBackwardVertices(columns, appointment, columnIndex) {
            var i,
                toVertices;

            for (i = columnIndex - 1; i >= 0; --i) {
                toVertices = calendarTiler.collideAppointmentIntoColumn(columns[i], appointment, true);

                if (Array.isArray(toVertices)) {
                    return toVertices;
                }
            }

            return [];
        },
        calculateBlockingDx: function CalendarTiler_calculateBlockingDx(positions, path, index, x) {
            var i,
                blockingVertexIndex = unsetIndexSentinel;

            for (i = index + 1; i < path.length; ++i) {
                if (positions[path[i]].x !== xSentinel) {
                    blockingVertexIndex = i;
                    break;
                }
            }

            return blockingVertexIndex > unsetIndexSentinel ? ((positions[path[blockingVertexIndex]].x - x) / (blockingVertexIndex - index)) : undefined;
        },
        calculateNonBlockingDx: function CalendarTiler_calculateDx(positions, path) {
            var i,
                unset = 0,
                dx = 0;

            for (i = 0; i < path.length; ++i) {
                if (positions[path[i]].dx < dxSentinel) {
                    dx += positions[path[i]].dx;
                } else {
                    ++unset;
                }
            }

            return ((1 - dx) / (unset || 1));
        },
        setXAndDxValues: function CalendarTiler_setXAndDxValues(positions, path, index) {
            var previousVertex = path[index - 1],
                x = isUndefined(previousVertex) ? 0 : (positions[previousVertex].x + positions[previousVertex].dx),
                dx = calendarTiler.calculateBlockingDx(positions, path, index, x);

            if (positions[path[index]].dx === dxSentinel) {
                positions[path[index]].x = x;
                positions[path[index]].dx = isUndefined(dx) ? calendarTiler.calculateNonBlockingDx(positions, path) : dx;
            }
        },
        generateTilingPositions: function CalendarTiler_generateTilingPositions(longestVertexPaths, positions) {
            var i,
                j;

            for (i = 0; i < longestVertexPaths.length; ++i) {
                for (j = 0; j < longestVertexPaths[i].length; ++j) {
                    calendarTiler.setXAndDxValues(positions, longestVertexPaths[i], j);
                }
            }
        },
        addAppointmentToColumns: function CalendarTiler_addAppointmentToColumns(columns, appointment) {
            var i,
                column;

            for (i = 0; i < columns.length; ++i) {
                column = columns[i];

                if (appointment.start >= column[column.length - 1].end ) {
                    column.push(appointment);
                    break;
                }

                column = undefined;
            }

            if (isUndefined(column)) {
                columns.push([appointment]);
            }
        },
        concatenateDirectedAcylicGraphPaths: function CalendarTiler_concatenateDirectedAcylicGraphPaths(dags, positions) {
            var i,
                path,
                pathKey,
                pathMap = {},
                longestPathsThroughVertices = [];

            for (i = 0; i < positions.length; ++i) {
                path = dags.backward.getLongestPathThroughVertex(i).concat([i]).concat(reverseArray(dags.forward.getLongestPathThroughVertex(i)));
                pathKey = path.join();

                if (isUndefined(pathMap[pathKey])) {
                    pathMap[pathKey] = true;
                    longestPathsThroughVertices.push(path);
                }
            }

            return longestPathsThroughVertices;
        },
        addEdgesToDirectedAcyclicGraphs: function CalendarTiler_addEdgesToDirectedAcyclicGraphs(dag, fromVertex, toVertices) {
            var i;

            for (i = 0; i < toVertices.length; ++i) {
                dag.addEdge(fromVertex, toVertices[i]);
            }
        },
        buildDirectedAcyclicGraphs: function CalendarTiler_buildDirectedAcyclicGraphs(columns, positions) {
            var i,
                j,
                column,
                dags = {
                    backward: new DirectedAcylicGraph(positions.length),
                    forward: new DirectedAcylicGraph(positions.length)
                };

            for (i = 0; i < columns.length; ++i) {
                column = columns[i];

                for (j = 0; j < column.length; ++j) {
                    calendarTiler.addEdgesToDirectedAcyclicGraphs(dags.backward, column[j].sortedIndex, calendarTiler.getDirectedAcyclicGraphBackwardVertices(columns, column[j], i));
                    calendarTiler.addEdgesToDirectedAcyclicGraphs(dags.forward, column[j].sortedIndex, calendarTiler.getDirectedAcyclicGraphForwardVertices(columns, column[j], i));
                }
            }

            return dags;
        },
        generateLongestVertexPaths: function CalendarTiler_generateLongestVertexPaths(positions, appointments) {
            var i,
                columns = [[appointments[0]]];

            for (i = 1; i < appointments.length; ++i) {
                calendarTiler.addAppointmentToColumns(columns, appointments[i]);
            }

            return calendarTiler.concatenateDirectedAcylicGraphPaths(calendarTiler.buildDirectedAcyclicGraphs(columns, positions), positions).sort(function (a, b) {
                return b.length - a.length;
            });
        },
        initializeTilingObject: function CalendarTiler_initializeTilingObject(appointments, appointmentsIn) {
            var i,
                tiling = {
                    positions: [],
                    sortedAppointments: new Array(appointmentsIn.length)
                };

            for (i = 0; i < appointments.length; ++i) {
                tiling.positions.push({
                    dx: dxSentinel,
                    x: xSentinel,
                    y: appointments[i].start,
                    dy: appointments[i].end - appointments[i].start,
                });

                tiling.sortedAppointments[i] = appointmentsIn[appointments[i].appointmentInIndex];
            }

            return tiling;
        },
        tileAppointments: function CalendarTiler_tileAppointments(appointmentsIn, tileParametersIn) {
            var tileParameters =  calendarTiler.mapTileParameters(tileParametersIn),
                appointments = calendarTiler.copyRelevantAppointmentData(appointmentsIn, tileParameters),
                tiling = calendarTiler.initializeTilingObject(appointments, appointmentsIn);

            calendarTiler.generateTilingPositions(appointmentsIn.length > 0 ? calendarTiler.generateLongestVertexPaths(tiling.positions, appointments) : [], tiling.positions);

            return tiling;
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
