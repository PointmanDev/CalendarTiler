class CalendarTiler {
    static isString(value) {
        return typeof value === 'string' || value instanceof String;
    }
    
    static sortAppointments(a, b) {
        return a.start - b.start || b.end - a.end;
    }
    
    static initializeCollisionSubArray(initialValue, length) {
        let i,
                array = [];

            for (i = length - 1; i >= 0; --i) {
                array.push(typeof initialValue !== 'undefined' ? initialValue : []);
            }
                
            return array;
        }

        static getTail(head, array) {
            let i;
            
            for (i = head + 1; i < array.length; ++i) {
                if (array[i] !== -1) {
                    return i;
                }
            }
            
            return array.length;
        }

        static getFirstIndexOf(val, array) {
            let i;
            
            for (i = 0; i < array.length; ++i) {
                if (array[i] === val) {
                    return i;
                }
            }
            
            return -1;
        }

        constructor(appointments, tileParameters) {
            if (!Array.isArray(appointments)) {
                throw 'CalendarTiler constructor, 1st argument - appointments: expects array.';
            }

            if (tileParameters !== Object(tileParameters)) {
                throw 'CalendarTiler constructor, 2nd argument - tileParameters: expects object.';
            }

            this.tileParameters = this.mapTileParameters(tileParameters);
            this.appointments = this.copyRelevantAppointmentData(appointments);
            this.collisions = this.initializeCollisions();

            this.initialize();
        }

        mapTileParameters(tileParameters) {
            let usesDuration = this.isString(tileParameters.duration);
            
            return {
                usesDuration: usesDuration,
                id: this.isString(tileParameters.id) ? tileParameters.id : 'id',
                start: this.isString(tileParameters.start) ? tileParameters.start : 'start',
                delineator: usesDuration ? tileParameters.duration : (this.isString(tileParameters.end) ? tileParameters.end : 'end')
            };
        }

        getAppointmentEnd(appointment) {
            if (this.tileParameters.usesDuration) {
                return appointment[this.tileParameters.start] + appointment[this.tileParameters.duration];
            }

            return appointment[this.tileParameters.end];
        }

        copyRelevantAppointmentData(appointments) {
            let i,
                values = [];
            
            for (i = appointments.length - 1; i >= 0; --i) {
                values.push({
                    id: appointments[i][this.tileParameters.id],
                    start: appointments[i][this.tileParameters.start],
                    end: this.getAppointmentEnd(appointments[i])
                });
            }

            return values.sort(this.sortAppointments);
        }

        initializeCollisions() {
            let appointmentsLength = this.appointments.length;

            return {
                front: this.initializeCollisionSubArray(appointmentsLength),
                back: this.initializeCollisionSubArray(appointmentsLength),
                tBack: this.initializeCollisionSubArray(appointmentsLength, -1),
                tFront: this.initializeCollisionSubArray(appointmentsLength),
                dx: this.initializeCollisionSubArray(appointmentsLength, 1),
                x: this.initializeCollisionSubArray(appointmentsLength, 0)
            };
        }

        initialize() {
            let j,
                k;

            if (this.appointments.length > 0) {
                for (j = 0; j < this.appointments.length; ++j) {
                    for (k = j + 1; k < this.appointments.length; ++k) {
                        if (this.appointments[k].start < this.appointments[j].end) {
                            this.collisions.front[j].push(k);
                        }
                    }
                
                    for (k = 0; k < j; ++k) {
                        if (this.appointments[k].end > this.appointments[j].start) {
                            this.collisions.back[j].push(k);
                        }
                    }
                }
                
                this.buildTBack();
            }
        
            return {
                dx: this.collisions.dx,
                x: this.collisions.x
            };
        }

        buildTBack() {
            let next,
                head,
                tail,
                path;
            
            while (this.getFirstIndexOf(-1, this.collisions.tBack) > -1) {
                head = this.getFirstIndexOf(-1, this.collisions.tBack);
                tail = this.getTail(head, this.collisions.tBack);
                path = (head > 0 ? this.collisions.tBack[head - 1].concat([head - 1]) : []);
                
                while (head < tail) {
                    this.collisions.tBack[head] = path;
                    next = this.collisions.front[head][this.collisions.front[head].length - 1];
                    head = (next ? (next >= tail ? tail : next + 1) : head + 1);
                }
            }
            
            this.buildTFront();
        }

        buildTFront() {
            let i,
                next;
            
            for (i = 0; i < this.collisions.tFront.length; ++i) {
                if (this.collisions.back[i].length === this.collisions.tBack[i].length) {
                    if (this.collisions.front[i].length > 0
                            && this.collisions.tBack[this.collisions.front[i][0]].length > this.collisions.tBack[i].length) {
                        this.collisions.tFront[i].push(this.collisions.front[i][0]);
                    }
                } else {
                    next = this.findNextTFront(i, this.collisions);
                        
                    if (this.collisions.front[i].length > 0
                            && this.getFirstIndexOf(next, this.collisions.back[this.collisions.front[i][0]]) > -1) {
                        if (this.collisions.tBack[this.collisions.front[i][0]].length < this.collisions.tBack[i].length) {
                            this.collisions.tFront[i].push(next);
                        } else {
                            this.collisions.tFront[i].push(this.collisions.front[i][0]);
                        }
                    } else {
                        this.collisions.tFront[i].push(next);
                    }
                }
            }
            
            this.expandTFront();
        }

        findNextTFront(index) {
            let i,
                tFront = [],
                minFront;
            
            for (i = 0; i < this.collisions.back[index].length; ++i) {
                if (this.collisions.tFront[tFront[i]].length > 0 && this.collisions.tFront[tFront[i]][0] === minFront) {
                    tFront.push(this.collisions.back[index][i]);
                }
            }
            
            minFront = tFront[0];
            
            for (i = 1; i < tFront.length; ++i) {
                if (this.collisions.tFront[tFront[i]].length > 0 && this.collisions.tFront[tFront[i]][0] === minFront) {
                    minFront = tFront[i];
                }
            }
            
            return minFront;
        }

        expandTFront() {
            let i,
                next;
				
            for (i = 0; i < this.collisions.tFront.length; ++i) {
                if (this.collisions.tFront[i].length > 0) {
                    next = this.collisions.tFront[this.collisions.tFront[i][0]][0];
                    
                    while (next) {
                        this.collisions.tFront[i].push(next);
                        
                        if (this.collisions.tFront[next].length > 0) {
                            next = this.collisions.tFront[next][0];
                        } else {
                            next = null;
                        }
                    }
                }
            }
            
            this.calculateDxs();
        }

        calculateDxs() {
            let i,
                j,
                chain,
                width,
                unset;
				
            for (i = 0; i < this.collisions.tBack.length; ++i) {
                if (this.collisions.dx[i] === 1) {
                    if (this.collisions.tFront[i].length === 0) {
                        for (j = 0; j < this.collisions.tBack[i].length; ++j) {
                            this.collisions.dx[i] -= this.collisions.dx[this.collisions.tBack[i][j]];
                        }
                    } else {
                        chain = this.findLongestChainThroughNode(i);
                        unset = 0;
                        width = 0;
                            
                        for (j = 0; j < chain.length; ++j) {
                            if (this.collisions.dx[chain[j]] < 1) {
                                width += this.collisions.dx[chain[j]];
                            } else {
                                ++unset;
                            }
                        }
                        
                        this.collisions.dx[i] = (1 - width) / unset;
                    }
                }
            }
            
            this.calculateXs();
        }

        findLongestChainThroughNode(index) {
            let i,
                chain = this.collisions.tBack[index].concat([index]).concat(this.collisions.tFront[index]);
                
            for (i = index; i < this.collisions.front[index].length; ++i) {
                if ((this.getFirstIndexOf(index, this.collisions.tBack[i]) > -1 || this.getFirstIndexOf(index, this.collisions.tFront[i]) > -1)
                        && this.collisions.tBack[i].length + this.collisions.tFront[i].length + 1 > chain.length) {
                    chain = this.collisions.tBack[i].concat([i]).concat(this.collisions.tFront[i]);
                }
            }
                
            return chain;
        }

        calculateXs() {
            let i,
                last;
            
            for (i = 1; i < this.collisions.dx.length; ++i) {
                if (this.collisions.tBack[i].length > 0) {
                    last = this.collisions.tBack[i][this.collisions.tBack[i].length - 1];
                    this.collisions.x[i] = this.collisions.x[last] + this.collisions.dx[last];
                }
            }
        }
    }
