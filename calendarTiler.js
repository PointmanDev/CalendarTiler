/*global define, module, self*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.calendarTiler = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var calendarTiler,
        positionBuilder,
        columnBuilder,
        alignmentBuilder,
        dagBuilders,
        fillSpaceDagBuilder,
        timeRespectiveDagBuilder,
        unsetIndexSentinel = -1,
        startSentinel = 0,
        xSentinel = 0,
        durationOrEndSentinel = 1,
        dxSentinel = 1,
        exceptions = {
            invalidAppointmentsInArgument: 'calendarTiler.tileAppointments - 1st argument - appointmentsIn: expects an array.',
            invalidAppointmentValue: function CalendarTiler_exceptions_invalidAppointmentValue(key, index) {
                return 'calendarTiler.tileAppointments - calendarTiler.copyRelevantAppointmentData - invalid '
                    + key
                    + ' on appointment index '
                    + index
                    + ' must be a finite number.';
            },
            invalidAppointmentDuration: function CalendarTiler_exceptions_invalidAppointmentDuration(key, index) {
                return 'calendarTiler.tileAppointments - calendarTiler.copyRelevantAppointmentData - calendarTiler.getAppointmentEnd - invalid '
                    + key
                    + ' on appointment index '
                    + index
                    + ' must be greater than zero.';
            },
            invalidAppointmentEnd: function CalendarTiler_exceptions_invalidAppointmentEnd(startKey, endKey, index) {
                return 'calendarTiler.tileAppointments - calendarTiler.copyRelevantAppointmentData - calendarTiler.getAppointmentEnd - invalid '
                    + endKey
                    + ' on appointment index '
                    + index
                    + ' must be greater than the corresponding ' + startKey + ' value.';
            }
        },
        isFiniteNumber = function CalendarTiler_functionisFiniteNumber(value) {
            return !Number.isNaN(value) && Number.isFinite(value);
        },
        isNull = function CalendarTiler_isNull(value) {
            return value === null;
        },
        isString = function CalendarTiler_isString(value) {
            return typeof value === 'string' || value instanceof String;
        },
        isObject = function CalendarTiler_isObject(value) {
            return typeof value === 'object' || value instanceof Object;
        },
        isUndefined = function CalendarTiler_isUndefined(value) {
            return value === undefined;
        },
        fillArray = function CalendarTiler_cfillArray(numberOfAppointments, initialValue) {
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

    function DirectedAcyclicGraph(numberOrVertices) {
        var dag = this,
            edges = fillArray(numberOrVertices),
            topologicalOrdering = [],
            topologicalSort = function CalendarTiler_DirectedAcyclicGraph_topologicalSort() {
                var i,
                    next,
                    last,
                    stack,
                    visitedVertices = fillArray(numberOrVertices, false);

                for (i = 0; i < numberOrVertices; ++i) {
                    if (!visitedVertices[i]) {
                        stack = [{
                            vertex: i,
                            edgeIndex: 0
                        }];

                        while (stack.length > 0) {
                            last = stack[stack.length - 1];
                            next = edges[last.vertex][last.edgeIndex];

                            if (visitedVertices[next]) {
                                ++last.edgeIndex;
                            } else if (isUndefined(next)) {
                                if (!visitedVertices[last.vertex]) {
                                    visitedVertices[last.vertex] = true;
                                    topologicalOrdering.push(last.vertex);
                                }

                                stack.pop();
                            } else {
                                stack.push({
                                    vertex: next,
                                    edgeIndex: 0
                                });
                            }
                        }
                    }
                }
            },
            buildPathsThroughVertex = function CalendarTiler_DirectedAcyclicGraph_buildPathsThroughVertex(vertex, incomingVertices) {
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

        dag.addEdge = function CalendarTiler_DirectedAcyclicGraph_addEdge(fromVertex, toVertex) {
            if (getFirstIndexOf(toVertex, edges[fromVertex]) === unsetIndexSentinel) {
                edges[fromVertex].push(toVertex);

                if (topologicalOrdering.length > 0) {
                    topologicalOrdering = [];
                }
            }
        };

        dag.getLongestPathThroughVertex = function CalendarTiler_DirectedAcyclicGraph_getLongestPathThroughVertex(vertex) {
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

    timeRespectiveDagBuilder = {
        addEdgeToDirectedAcyclicGraphs: function CalendarTiler_timeRespectiveDagBuilder_addEdgeToDirectedAcyclicGraphs(alignments, dags, fromVertex, toVertex) {
            if (alignments.rFront[toVertex][0] === fromVertex) {
                dags.backward.addEdge(fromVertex, toVertex);
            }

            if (alignments.rBack[toVertex][alignments.rBack[toVertex].length - 1] === fromVertex) {
                dags.forward.addEdge(fromVertex, toVertex);
            }
        },
        addEdgesToDirectedAcyclicGraphs: function CalendarTiler_timeRespectiveDagBuilder_addEdgesToDirectedAcyclicGraphs(alignments, dags, fromVertex) {
            var i;

            if (alignments.rBack[fromVertex].length > 0) {
                dags.backward.addEdge(fromVertex, alignments.rBack[fromVertex][alignments.rBack[fromVertex].length - 1]);
            }

            if (alignments.rFront[fromVertex].length > 0) {
                dags.forward.addEdge(fromVertex, alignments.rFront[fromVertex][0]);
            }

            for (i = alignments.rBack.length - 1; i > fromVertex; --i) {
                timeRespectiveDagBuilder.addEdgeToDirectedAcyclicGraphs(alignments, dags, fromVertex, i);
            }

            for (i = fromVertex - 1; i >= 0; --i) {
                timeRespectiveDagBuilder.addEdgeToDirectedAcyclicGraphs(alignments, dags, fromVertex, i);
            }
        },
        build: function CalendarTiler_timeRespectiveDagBuilder_build(positions, appointments, alignments) {
            var i,
                dags = {
                    backward: new DirectedAcyclicGraph(positions.length),
                    forward: new DirectedAcyclicGraph(positions.length)
                };

            for (i = 0; i < positions.length; ++i) {
                timeRespectiveDagBuilder.addEdgesToDirectedAcyclicGraphs(alignments, dags, i);
            }

            return dags;
        }
    };

    fillSpaceDagBuilder = {
        requiresColumns: true,
        doAppointmentsCollide: function CalendarTiler_fillSpaceDagBuilder_doAppointmentsCollide(appointmentA, appointmentB, inReverse) {
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
        collideAppointmentIntoColumn: function CalendarTiler_fillSpaceDagBuilder_collideAppointmentIntoColumn(column, appointment, inReverse) {
            var i,
                collisionIndex,
                toVertices = [];

            for (i = 0; i < column.length; ++i) {
                collisionIndex = fillSpaceDagBuilder.doAppointmentsCollide(appointment, column[i], inReverse);

                if (collisionIndex > -1) {
                    toVertices.push(collisionIndex);
                } else if (isUndefined(collisionIndex)) {
                    return toVertices.length > 0 ? toVertices : undefined;
                }
            }

            return toVertices.length > 0 ? toVertices : undefined;
        },
        getExtendedDirectedAcyclicGraphForwardVertices: function CalendarTiler_fillSpaceDagBuilder_getExtendedDirectedAcyclicGraphForwardVertices(appointments, columns, appointment, linchPinAppointment, columnIndex) {
            var i,
                j,
                extendedToVertices,
                collisionIndex,
                toVertices = [];

            for (i = columnIndex + 1; i < columns.length; ++i) {
                extendedToVertices = fillSpaceDagBuilder.collideAppointmentIntoColumn(columns[i], appointment);

                if (Array.isArray(extendedToVertices)) {
                    if (extendedToVertices.length > 0) {
                        for (j = 0; j < extendedToVertices.length; ++j) {
                            collisionIndex = fillSpaceDagBuilder.doAppointmentsCollide(linchPinAppointment, appointments[extendedToVertices[j]]);

                            if (!isUndefined(collisionIndex) && collisionIndex !== -1) {
                                return toVertices;
                            } else {
                                toVertices.push(extendedToVertices[j]);
                            }
                        }
                    }

                    return toVertices;
                }
            }

            return toVertices;
        },
        getDirectedAcyclicGraphForwardVertices: function CalendarTiler_fillSpaceDagBuilder_getDirectedAcyclicGraphForwardVertices(appointments, columns, appointment, columnIndex) {
            var i,
                toVertices,
                linchPinAppointment,
                reducedColumnsLength = columns.length - 1;

            for (i = columnIndex + 1; i < columns.length; ++i) {
                toVertices = fillSpaceDagBuilder.collideAppointmentIntoColumn(columns[i], appointment);

                if (Array.isArray(toVertices)) {
                    linchPinAppointment = appointments[toVertices[0]];

                    if (i < reducedColumnsLength && toVertices.length > 0 && appointment.end > linchPinAppointment.start) {
                        return toVertices.concat(fillSpaceDagBuilder.getExtendedDirectedAcyclicGraphForwardVertices(appointments, columns, appointment, linchPinAppointment, i));
                    }

                    return toVertices;
                }
            }

            return [];
        },
        getDirectedAcyclicGraphBackwardVertices: function CalendarTiler_fillSpaceDagBuilder_getDirectedAcyclicGraphBackwardVertices(columns, appointment, columnIndex) {
            var i,
                toVertices;

            for (i = columnIndex - 1; i >= 0; --i) {
                toVertices = fillSpaceDagBuilder.collideAppointmentIntoColumn(columns[i], appointment, true);

                if (Array.isArray(toVertices)) {
                    return toVertices;
                }
            }

            return [];
        },
        addEdgesToDirectedAcyclicGraphs: function CalendarTiler_fillSpaceDagBuilder_addEdgesToDirectedAcyclicGraphs(dag, fromVertex, toVertices) {
            var i;

            for (i = 0; i < toVertices.length; ++i) {
                dag.addEdge(fromVertex, toVertices[i]);
            }
        },
        build: function CalendarTiler_fillSpaceDagBuilder_build(positions, appointments, columns) {
            var i,
                j,
                column,
                dags = {
                    backward: new DirectedAcyclicGraph(positions.length),
                    forward: new DirectedAcyclicGraph(positions.length)
                };

            for (i = 0; i < columns.length; ++i) {
                column = columns[i];

                for (j = 0; j < column.length; ++j) {
                    fillSpaceDagBuilder.addEdgesToDirectedAcyclicGraphs(dags.backward, column[j].sortedIndex, fillSpaceDagBuilder.getDirectedAcyclicGraphBackwardVertices(columns, column[j], i));
                    fillSpaceDagBuilder.addEdgesToDirectedAcyclicGraphs(dags.forward, column[j].sortedIndex, fillSpaceDagBuilder.getDirectedAcyclicGraphForwardVertices(appointments, columns, column[j], i));
                }
            }

            return dags;
        }
    };

    dagBuilders = {
        balanced: null,
        timeRespective: timeRespectiveDagBuilder,
        fillSpace: fillSpaceDagBuilder
    };

    alignmentBuilder = {
        getTail: function CalendarTiler_alignmentBuilder_getTail(head, array) {
            var i;

            for (i = head + 1; i < array.length; ++i) {
                if (array[i] !== unsetIndexSentinel) {
                    return i;
                }
            }

            return array.length;
        },
        expandRFront: function CalendarTiler_alignmentBuilder_expandRFront(alignments, index) {
            if (alignments.rFront[index].length === 1) {
                var next = alignments.rFront[alignments.rFront[index][0]][0];

                while (next) {
                    alignments.rFront[index].push(next);

                    if (alignments.rFront[next].length > 0) {
                        next = alignments.rFront[next][0];
                    } else {
                        return;
                    }
                }
            }
        },
        sharesLinchPin: function CalendarTiler_alignmentBuilder_sharesLinchPin(alignments, minFront, index) {
            var i,
                linchPin,
                rBack = alignments.rBack[minFront];

            for (i = rBack.length - 1; i >= 0; --i) {
                linchPin = rBack[i];

                if (getFirstIndexOf(linchPin, alignments.rFront[index]) > unsetIndexSentinel) {
                    return true;
                }
            }

            return false;
        },
        findNextRFrontFromBack: function CalendarTiler_alignmentBuilder_findNextRFrontFromBack(alignments, index) {
            var i,
                back,
                minFront;

            for (i = 0; i < alignments.back[index].length; ++i) {
                back = alignments.back[index][i];

                if (getFirstIndexOf(back, alignments.rBack[index]) === unsetIndexSentinel) {
                    alignmentBuilder.expandRFront(alignments, back);
                    minFront = minFront || back;

                    if (back !== minFront && (getFirstIndexOf(minFront, alignments.rFront[back]) > unsetIndexSentinel || alignmentBuilder.sharesLinchPin(alignments, minFront, back))) {
                        minFront = back;
                    }
                }
            }

            return minFront;
        },
        buildRFront: function CalendarTiler_alignmentBuilder_buildRFront(alignments) {
            var i,
                next;

            for (i = 0; i < alignments.rFront.length; ++i) {
                if (alignments.back[i].length === alignments.rBack[i].length) {
                    if (alignments.front[i].length > 0 && alignments.rBack[alignments.front[i][0]].length > alignments.rBack[i].length) {
                        alignments.rFront[i].push(alignments.front[i][0]);
                    }
                } else {
                    next = next || alignmentBuilder.findNextRFrontFromBack(alignments, i);

                    if (alignments.front[i].length > 0 && getFirstIndexOf(next, alignments.back[alignments.front[i][0]]) > unsetIndexSentinel) {
                        if (alignments.rBack[alignments.front[i][0]].length < alignments.rBack[i].length) {
                            alignments.rFront[i].push(next);
                            next = null;
                        } else {
                            alignments.rFront[i].push(alignments.front[i][0]);
                        }
                    } else {
                        alignments.rFront[i].push(next);
                        next = null;
                    }
                }
            }
        },
        buildRBack: function CalendarTiler_alignmentBuilder_buildRBack(alignments) {
            var next,
                head,
                tail,
                path;

            while (getFirstIndexOf(unsetIndexSentinel, alignments.rBack) > unsetIndexSentinel) {
                head = getFirstIndexOf(unsetIndexSentinel, alignments.rBack);
                tail = alignmentBuilder.getTail(head, alignments.rBack);
                path = (head > 0 ? alignments.rBack[head - 1].concat([head - 1]) : []);

                while (head < tail) {
                    alignments.rBack[head] = path;
                    next = alignments.front[head][alignments.front[head].length - 1];
                    head = (next ? (next >= tail ? tail : next + 1) : head + 1);
                }
            }

            alignmentBuilder.buildRFront(alignments);
        },
        initializeAlignments: function CalendarTiler_alignmentBuilder_initializeAlignments(appointments) {
            var numberOfAppointments = appointments.length;

            return {
                front: fillArray(numberOfAppointments),
                back: fillArray(numberOfAppointments),
                rBack: fillArray(numberOfAppointments, unsetIndexSentinel),
                rFront: fillArray(numberOfAppointments)
            };
        },
        buildAppointmentAlignments: function CalendarTiler_alignmentBuilder_buildAppointmentAlignments(appointments) {
            var i,
                j,
                alignments = alignmentBuilder.initializeAlignments(appointments);

            if (appointments.length > 0) {
                for (i = 0; i < appointments.length; ++i) {
                    for (j = i + 1; j < appointments.length; ++j) {
                        if (appointments[j].start < appointments[i].end) {
                            alignments.front[i].push(j);
                        }
                    }

                    for (j = 0; j < i; ++j) {
                        if (appointments[j].end > appointments[i].start) {
                            alignments.back[i].push(j);
                        }
                    }
                }

                alignmentBuilder.buildRBack(alignments);
            }

            return alignments;
        }
    };

    columnBuilder = {
        addAppointmentToColumns: function CalendarTiler_columnBuilder_addAppointmentToColumns(columns, appointment) {
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
        buildAppointmentColumns: function CalendarTiler_columnBuilder_buildAppointmentColumns(appointments) {
            var i,
                columns = [[appointments[0]]];

            for (i = 1; i < appointments.length; ++i) {
                columnBuilder.addAppointmentToColumns(columns, appointments[i]);
            }

            return columns;
        }
    };

    positionBuilder = {
        generateLongestVertexPaths: function CalendarTiler_positionBuilder_generateLongestVertexPaths(positions, dags) {
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

            return longestPathsThroughVertices.sort(function (a, b) {
                return b.length - a.length;
            });
        },
        calculateBlockingDx: function CalendarTiler_positionBuilder_calculateBlockingDx(positions, path, index, x) {
            var i;

            for (i = index + 1; i < path.length; ++i) {
                if (positions[path[i]].x !== xSentinel) {
                    return (positions[path[i]].x - x) / (i - index);
                }
            }

            return undefined;
        },
        calculateNonBlockingDx: function CalendarTiler_positionBuilder_calculateDx(positions, path) {
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
        setPosition: function CalendarTiler_positionBuilder_setPosition(positions, path, index) {
            var previousVertex = path[index - 1],
                x = isUndefined(previousVertex) ? 0 : (positions[previousVertex].x + positions[previousVertex].dx),
                dx = positionBuilder.calculateBlockingDx(positions, path, index, x);

            if (positions[path[index]].dx === dxSentinel) {
                positions[path[index]].x = x;
                positions[path[index]].dx = isUndefined(dx) ? positionBuilder.calculateNonBlockingDx(positions, path) : dx;
            }
        },
        generatePositionsFromDags: function CalendarTiler_positionBuilder_generatePositionsFromDags(positions, dags) {
            var i,
                j,
                longestVertexPaths = positionBuilder.generateLongestVertexPaths(positions, dags);

            for (i = 0; i < longestVertexPaths.length; ++i) {
                for (j = 0; j < longestVertexPaths[i].length; ++j) {
                    positionBuilder.setPosition(positions, longestVertexPaths[i], j);
                }
            }
        },
        generatePositionsFromColumns: function CalendarTiler_positionBuilder_generatePositionsFromColumns(positions, columns) {
            var i,
                j,
                column,
                positionIndex,
                columnPosition,
                columnsLength = columns.length,
                columnWidth = 1 / columnsLength;

            for (i = columnsLength - 1; i >= 0; --i) {
                column = columns[i];
                columnPosition = i / columnsLength;

                for (j = column.length - 1; j >= 0; --j) {
                    positionIndex = column[j].sortedIndex;
                    positions[positionIndex].x = columnPosition;
                    positions[positionIndex].dx = columnWidth;
                }
            }
        }
    };

    calendarTiler = {
        sortAppointments: function CalendarTiler_calenderTiler_sortAppointments(a, b) {
            return a.start - b.start || b.end - a.end;
        },
        mapTileParameters: function CalendarTiler_calenderTiler_mapTileParameters(tileParametersIn) {
            var tileParameters = isObject(tileParametersIn) ? tileParametersIn : {},
                dagBuilderKey = isString(tileParametersIn.tilingMethod) && !isUndefined(dagBuilders[tileParametersIn.tilingMethod])
                    ? tileParametersIn.tilingMethod
                    : 'fillSpace';

            return {
                dagBuilder: dagBuilders[dagBuilderKey],
                usesDuration: !!tileParameters.usesDuration,
                start: isString(tileParameters.start) ? tileParameters.start : 'start',
                delineator: isString(tileParameters.delineator) ? tileParameters.delineator : 'end'
            };
        },
        isValiidAppointmentValue: function CalendarTiler_calenderTiler_isValiidAppointmentValue(value, key, index) {
            if (!isFiniteNumber(value)) {
                throw exceptions.invalidAppointmentValue(key, index);
            }

            return true;
        },
        getAppointmentEnd: function CalendarTiler_calenderTiler_getAppointmentEnd(startValue, appointmentIn, tileParameters, index) {
            var delineatorValue = appointmentIn[tileParameters.delineator];

            if (calendarTiler.isValiidAppointmentValue(delineatorValue, tileParameters.delineator, index)) {
                if (tileParameters.usesDuration) {
                    if (delineatorValue <= 0) {
                        throw exceptions.invalidAppointmentDuration(tileParameters.delineator, index);
                    } else {
                        return startValue + delineatorValue;
                    }
                } else if (delineatorValue <= startValue) {
                    throw exceptions.invalidAppointmentEnd(tileParameters.start, tileParameters.end, index);
                } else {
                    return delineatorValue;
                }
            }

            return durationOrEndSentinel;
        },
        copyRelevantAppointmentData: function CalendarTiler_calenderTiler_copyRelevantAppointmentData(appointmentsIn, tileParameters) {
            var i,
                startValue,
                appointments = [];

            for (i = appointmentsIn.length - 1; i >= 0; --i) {
                startValue = appointmentsIn[i][tileParameters.start];

                appointments.push({
                    appointmentInIndex: i,
                    start: calendarTiler.isValiidAppointmentValue(startValue, tileParameters.start, i) ? startValue : startSentinel,
                    end: calendarTiler.getAppointmentEnd(startValue, appointmentsIn[i], tileParameters, i)
                });
            }

            appointments.sort(calendarTiler.sortAppointments);

            for (i = appointments.length - 1; i >= 0; --i) {
                appointments[i].sortedIndex = i;
            }

            return appointments;
        },
        initializeTilingObject: function CalendarTiler_calenderTiler_initializeTilingObject(appointments, appointmentsIn) {
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
                    dy: appointments[i].end - appointments[i].start
                });

                tiling.sortedAppointments[i] = appointmentsIn[appointments[i].appointmentInIndex];
            }

            return tiling;
        },
        tileAppointments: function CalendarTiler_calenderTiler_tileAppointments(appointmentsIn, tileParametersIn) {
            var tileParameters =  calendarTiler.mapTileParameters(tileParametersIn),
                appointments = calendarTiler.copyRelevantAppointmentData(appointmentsIn, tileParameters),
                tiling = calendarTiler.initializeTilingObject(appointments, appointmentsIn),
                columnsOrAlignments = isNull(tileParameters.dagBuilder) || tileParameters.dagBuilder.requiresColumns ? columnBuilder.buildAppointmentColumns(appointments) : alignmentBuilder.buildAppointmentAlignments(appointments);

            if (appointments.length > 0) {
                if (isNull(tileParameters.dagBuilder)) {
                    positionBuilder.generatePositionsFromColumns(tiling.positions, columnsOrAlignments);
                } else {
                    positionBuilder.generatePositionsFromDags(tiling.positions, tileParameters.dagBuilder.build(tiling.positions, appointments, columnsOrAlignments));
                }
            }

            return tiling;
        }
    };

    return {
        tileAppointments: function CalendarTiler_calenderTiler_initialize(appointmentsIn, tileParametersIn) {
            if (!Array.isArray(appointmentsIn)) {
                throw exceptions.invalidAppointmentsInArgument;
            }

            return calendarTiler.tileAppointments(appointmentsIn, tileParametersIn);
        }
    };
}));
