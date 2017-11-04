class CalendarTiler {
    static isString(value) {
        return typeof value === 'string' || value instanceof String;
    }
    
    static sortAppointments(a, b) {
        return a.start - b.start || b.end - a.end;
    }
    
    static initializeTilingSubArray(initialValue, length) {
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
        this.tiling = this.initializeTiling();
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

    initializeTiling() {
        let appointmentsLength = this.appointments.length;
        
        return {
            front: this.initializeTilingSubArray(appointmentsLength),
            back: this.initializeTilingSubArray(appointmentsLength),
            tBack: this.initializeTilingSubArray(appointmentsLength, -1),
            tFront: this.initializeTilingSubArray(appointmentsLength),
            dx: this.initializeTilingSubArray(appointmentsLength, 1),
            x: this.initializeTilingSubArray(appointmentsLength, 0)
        };
    }
    
    initialize() {
        let j,
            k;
        
        if (this.appointments.length > 0) {
            for (j = 0; j < this.appointments.length; ++j) {
                for (k = j + 1; k < this.appointments.length; ++k) {
                    if (this.appointments[k].start < this.appointments[j].end) {
                        this.tiling.front[j].push(k);
                    }
                }
                
                for (k = 0; k < j; ++k) {
                    if (this.appointments[k].end > this.appointments[j].start) {
                        this.tiling.back[j].push(k);
                    }
                }
            }
            
            this.buildTBack();
        }
        
        return {
            dx: this.tiling.dx,
            x: this.tiling.x
        };
    }

    buildTBack() {
        let next,
            head,
            tail,
            path;
            
        while (this.getFirstIndexOf(-1, this.tiling.tBack) > -1) {
            head = this.getFirstIndexOf(-1, this.tiling.tBack);
            tail = this.getTail(head, this.tiling.tBack);
            path = (head > 0 ? this.tiling.tBack[head - 1].concat([head - 1]) : []);
            
            while (head < tail) {
                this.tiling.tBack[head] = path;
                next = this.tiling.front[head][this.tiling.front[head].length - 1];
                head = (next ? (next >= tail ? tail : next + 1) : head + 1);
            }
        }
        
        this.buildTFront();
    }
    
    buildTFront() {
        let i,
            next;
        
        for (i = 0; i < this.tiling.tFront.length; ++i) {
            if (this.tiling.back[i].length === this.tiling.tBack[i].length) {
                if (this.tiling.front[i].length > 0 && this.tiling.tBack[this.tiling.front[i][0]].length > this.tiling.tBack[i].length) {
                    this.tiling.tFront[i].push(this.tiling.front[i][0]);
                }
            } else {
                next = next || this.findNextTFrontFromBack(i, this.tiling);
                
                if (this.tiling.front[i].length > 0 && this.getFirstIndexOf(next, this.tiling.back[this.tiling.front[i][0]]) > -1) {
                    if (this.tiling.tBack[this.tiling.front[i][0]].length < this.tiling.tBack[i].length) {
                        this.tiling.tFront[i].push(next);
                        next = null;
                    } else {
                        this.tiling.tFront[i].push(this.tiling.front[i][0]);
                    }
                } else {
                    this.tiling.tFront[i].push(next);
                    next = null;
                }
            }
        }
        
        this.expandRemainingTFront();
    }
    
    findNextTFrontFromBack(index) {
        let i,
            back,
            minFront;
        
        for (i = 0; i < this.tiling.back[index].length; ++i) {
            back = this.tiling.back[index][i];
            if (this.getFirstIndexOf(back, this.tiling.tBack[index]) === -1) {
                this.expandTFront(back);
                minFront = minFront || back;
                
                if (back !== minFront && (this.getFirstIndexOf(minFront, this.tiling.tFront[back]) > -1 || this.sharesLinchPin(minFront, back))) {
                    minFront = back;
                }
            }
        }
        
        return minFront;
    }

    sharesLinchPin(minFront, index) {
        let tBack = this.tiling.tBack[minFront],
            linchPin = tBack[tBack.length - 1];
        
        if (linchPin && this.getFirstIndexOf(linchPin, this.tiling.tFront[index]) > -1) {
            return true;
        }
        
        return false;
    }
    
    expandTFront(index) {
        if (this.tiling.tFront[index].length === 1) {
            let next = this.tiling.tFront[this.tiling.tFront[index][0]][0];
            
            while (next) {
                this.tiling.tFront[index].push(next);
                if (this.tiling.tFront[next].length > 0) {
                    next = this.tiling.tFront[next][0];
                } else {
                    return;
                }
            }
        }
    }
    
    expandRemainingTFront() {
        let i;
        
        for (i = 0; i < this.tiling.tFront.length; ++i) {
            this.expandTFront(i);
        }
        
        this.calculateDxs();
    }

    calculateDxs() {
        let i,
            j,
            chain,
            width,
            unset;
        
        for (i = 0; i < this.tiling.tBack.length; ++i) {
            if (this.tiling.dx[i] === 1) {
                if (this.tiling.tFront[i].length === 0) {
                    for (j = 0; j < this.tiling.tBack[i].length; ++j) {
                        this.tiling.dx[i] -= this.tiling.dx[this.tiling.tBack[i][j]];
                    }
                } else {
                    chain = this.findLongestChainThroughNode(i);
                    unset = 0;
                    width = 0;
                            
                    for (j = 0; j < chain.length; ++j) {
                        if (this.tiling.dx[chain[j]] < 1) {
                            width += this.tiling.dx[chain[j]];
                        } else {
                            ++unset;
                        }
                    }
                    
                    this.tiling.dx[i] = (1 - width) / unset;
                }
            }
        }
        
        this.calculateXs();
    }

    findLongestChainThroughNode(index) {
        let i,
            chain = this.tiling.tBack[index].concat([index]).concat(this.tiling.tFront[index]);
        
        for (i = index; i < this.tiling.front[index].length; ++i) {
            if ((this.getFirstIndexOf(index, this.tiling.tBack[i]) > -1 || this.getFirstIndexOf(index, this.tiling.tFront[i]) > -1)
                    && this.tiling.tBack[i].length + this.tiling.tFront[i].length + 1 > chain.length) {
                chain = this.tiling.tBack[i].concat([i]).concat(this.tiling.tFront[i]);
            }
        }
        
        return chain;
    }
    
    calculateXs() {
        let i,
            last;
        
        for (i = 1; i < this.tiling.dx.length; ++i) {
            if (this.tiling.tBack[i].length > 0) {
                last = this.tiling.tBack[i][this.tiling.tBack[i].length - 1];
                this.tiling.x[i] = this.tiling.x[last] + this.tiling.dx[last];
            }
        }
    }
}