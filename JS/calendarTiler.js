/*global define, module*/
(function (root, factory) {
    'use strict';
    
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.calendarTile = factory();
    }
}(this, function () {
    'use strict';
    
    var collisions,
        getTail = function calendarTiler_getTail(head, array) {
            var i;
            
            for (i = head + 1; i < array.length; ++i) {
                if (array[i] !== -1) {
                    return i;
                }
            }
            
            return array.length;
        },
        getFirstIndexOf = function calendarTiler_getFirstIndexOf(val, array) {
            var i;
            
            for (i = 0; i < array.length; ++i) {
                if (array[i] === val) {
                    return i;
                }
            }
            
            return -1;
        },
        calculateXs = function calendarTiler_calculateXs() {
            var i,
                last;
            
            for (i = 1; i < collisions.dx.length; ++i) {
                if (collisions.tBack[i].length > 0) {
                    last = collisions.tBack[i][collisions.tBack[i].length - 1];
                    collisions.x[i] = collisions.x[last] + collisions.dx[last];
				}
            }
        },
        findLongestChainThroughNode = function calendarTiler_findLongestChainThroughNode(index) {
            var i,
                chain = collisions.tBack[index].concat([index]).concat(collisions.tFront[index]);
                
            for (i = index; i < collisions.front[index].length; ++i) {
                if ((getFirstIndexOf(index, collisions.tBack[i]) > -1 || getFirstIndexOf(index, collisions.tFront[i]) > -1)
                        && collisions.tBack[i].length + collisions.tFront[i].length + 1 > chain.length) {
                    chain = collisions.tBack[i].concat([i]).concat(collisions.tFront[i]);
                }
            }
                
            return chain;
        },
        calculateDxs = function calendarTiler_calculateDxs() {
            var i,
                j,
                chain,
                width,
                unset;
				
            for (i = 0; i < collisions.tBack.length; ++i) {
                if (collisions.dx[i] === 1) {
                    if (collisions.tFront[i].length === 0) {
                        for (j = 0; j < collisions.tBack[i].length; ++j) {
                            collisions.dx[i] -= collisions.dx[collisions.tBack[i][j]];
                        }
                    } else {
                        chain = findLongestChainThroughNode(i, collisions);
                        unset = 0;
                        width = 0;
                            
                        for (j = 0; j < chain.length; ++j) {
                            if (collisions.dx[chain[j]] < 1) {
                                width += collisions.dx[chain[j]];
                            } else {
                                ++unset;
                            }
                        }
                        
                        collisions.dx[i] = (1 - width) / unset;
                    }
                }
            }
            
            calculateXs(collisions);
        },
        expandTFront = function calendarTiler_expandTFront() {
            var i,
                next;
				
            for (i = 0; i < collisions.tFront.length; ++i) {
                if (collisions.tFront[i].length > 0) {
                    next = collisions.tFront[i].length > 0 ? collisions.tFront[collisions.tFront[i][0]][0] : null;
                    
                    while (next) {
                        collisions.tFront[i].push(next);
                        
                        if (collisions.tFront[next].length > 0) {
                            next = collisions.tFront[next][0];
                        } else {
                            next = null;
                        }
                    }
                }
            }
            
            calculateDxs(collisions);
        },
        findNextTFront = function calendarTiler_findNextTFront(index) {
            var i,
                tBack = [],
                maxFront = -1,
                maxIndex = index;
                
            for (i = 0; i < collisions.back[index].length; ++i) {
                if (getFirstIndexOf(collisions.back[index][i], collisions.tBack[index]) === -1) {
                    tBack.push(collisions.back[index][i]);
                }
            }
                
            for (i = 0; i < tBack.length; ++i) {
                if (collisions.tFront[tBack[i]].length > maxFront) {
                    maxFront = collisions.tFront[tBack[i]].length;
                    maxIndex = tBack[i];
                }
            }
                
            return maxIndex;
        },
        buildTFront = function calendarTiler_buildTFront() {
            var i,
                next;
            
            for (i = 0; i < collisions.tFront.length; ++i) {
                if (collisions.back[i].length === collisions.tBack[i].length) {
                    if (collisions.front[i].length > 0
                            && collisions.tBack[collisions.front[i][0]].length > collisions.tBack[i].length) {
                        collisions.tFront[i].push(collisions.front[i][0]);
                    }
                } else {
                    next = findNextTFront(i, collisions);
                        
                    if (collisions.front[i].length > 0
                            && getFirstIndexOf(next, collisions.back[collisions.front[i][0]]) > -1) {
                        if (collisions.tBack[collisions.front[i][0]].length < collisions.tBack[i].length) {
                            collisions.tFront[i].push(next);
                        } else {
                            collisions.tFront[i].push(collisions.front[i][0]);
                        }
                    } else {
                        collisions.tFront[i].push(next);
                    }
                }
            }
            
            expandTFront(collisions);
        },
        buildTBack = function calendarTiler_buildTBack() {
            var next,
                head,
				tail,
				path;
            
            while (getFirstIndexOf(-1, collisions.tBack) > -1) {
                head = getFirstIndexOf(-1, collisions.tBack);
				tail = getTail(head, collisions.tBack);
                path = (head > 0 ? collisions.tBack[head - 1].concat([head - 1]) : []);
					
				while (head < tail) {
					collisions.tBack[head] = path;
					next = collisions.front[head][collisions.front[head].length - 1];
					head = (next ? (next >= tail ? tail : next + 1) : head + 1);
                }
            }
            
            buildTFront(collisions);
        },
        buildCollisionArrays = function calendarTiler_buildCollisionArrays(events) {
            var j,
				k;
            
            if (events.length > 0) {
                for (j = 0; j < events.length; ++j) {
					for (k = j + 1; k < events.length; ++k) {
						if (events[k].start < events[j].start + events[j].duration) {
                            collisions.front[j].push(k);
                        }
                    }
                    
                    for (k = 0; k < j; ++k) {
                        if (events[k].start + events[k].duration > events[j].start) {
                            collisions.back[j].push(k);
                        }
                    }
                }
			
                buildTBack(collisions);
            }
        },
        initializeCollisionSubArray = function initializeCollisionSubArray(numberOfEvents, initialValue) {
            var i,
                array = [];
                
            for (i = 0; i < numberOfEvents; ++i) {
                array.push(typeof initialValue !== 'undefined' ? initialValue : []);
            }
                
            return array;
        };
    
    return function calendarTile(events) {
        collisions = {
            front: initializeCollisionSubArray(events.length),
            back: initializeCollisionSubArray(events.length),
            tBack: initializeCollisionSubArray(events.length, -1),
            tFront: initializeCollisionSubArray(events.length),
            dx: initializeCollisionSubArray(events.length, 1),
            x: initializeCollisionSubArray(events.length, 0)
        };
            
        buildCollisionArrays(events);
            
        return {
            dx: collisions.dx,
            x: collisions.x
        };
    };
}));