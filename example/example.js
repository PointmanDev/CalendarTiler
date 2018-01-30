/*global window, document, console*/
(function () {
    'use strict';

    var appointmentWidthModifier,
        appointments,
        tiling,
        hoursPerDay = 24,
        minutesPerHour = 60,
        numberOfSubdivisionsPerHour = 4,
        subdivisionHeight = 20,
        minimumAppointmentWidth = 30,
        numberOfAppointments = 20,
        totalNumberOfSubdivisions = hoursPerDay * numberOfSubdivisionsPerHour,
        subdivisions = {},
        gradientValues = [],
        htmlElements = {
            exampleTimes: document.getElementById('example-times'),
            exampleAppointments: document.getElementById('example-appointments'),
            exampleNumberOfAppointmentsInput: document.getElementById('example-number-of-appointments-input'),
            exampleNumberOfAppointmentsButton: document.getElementById('example-number-of-appointments-button')
        },
        generateSubdivisions = function example_generateSubdivisions() {
            var i,
                minutes,
                minutesPerMinuteDivision = minutesPerHour / numberOfSubdivisionsPerHour;

            for (i = 0; i < numberOfSubdivisionsPerHour; ++i) {
                minutes = minutesPerMinuteDivision * i;
                subdivisions[i] = String((minutes < 10 ? '0' : '') + minutes);
            }
        },
        getTimeText = function example_getTimeText(timeElementIndex) {
            var miniuteDivision = timeElementIndex % 4,
                hour = Math.floor(timeElementIndex / 4);

            return (hour < 10 ? '0' : '') + hour + ':' + subdivisions[miniuteDivision];
        },
        generateRandomAppointment = function example_generateRandomAppointment() {
            var startHour = Math.floor(Math.random() * (hoursPerDay - 1)),
                startMinutes = Math.floor(Math.random() * numberOfSubdivisionsPerHour),
                start = startHour + (startMinutes / numberOfSubdivisionsPerHour),
                remainingTime = hoursPerDay - start,
                end = Math.min(hoursPerDay, start + Math.max((Math.floor(Math.random() * remainingTime)), (1 / numberOfSubdivisionsPerHour)));

            return {
                start: start,
                end: end
            };
        },
        cleanAppointments = function example_cleanAppointments() {
            while (htmlElements.exampleAppointments.children.length > totalNumberOfSubdivisions) {
                htmlElements.exampleAppointments.removeChild(htmlElements.exampleAppointments.lastChild);
            }
        },
        renderAppointment = function example_renderAppointment(index) {
            var appointment = document.createElement('div');

            appointment.classList.add('example-appointment');
            appointment.innerHTML = String(index + 1);
            appointment.style.height = (subdivisionHeight * numberOfSubdivisionsPerHour * tiling.dy[index]) + 'px';
            appointment.style.top = (tiling.y[index] * numberOfSubdivisionsPerHour * subdivisionHeight) + 'px';
            appointment.style.width = (appointmentWidthModifier * tiling.dx[index]) + 'px';
            appointment.style.left = (appointmentWidthModifier * tiling.x[index]) + 'px';

            htmlElements.exampleAppointments.appendChild(appointment);
        },
        setScheduleWidth = function example_setAppointmentsWidth() {
            var i,
                minimalDx = Infinity,
                adjustedWindowWidth = window.innerWidth - 100;

            for (i = 0; i < numberOfAppointments; ++i) {
                if (tiling.dx[i] < minimalDx) {
                    minimalDx = tiling.dx[i];
                }
            }

            appointmentWidthModifier = Math.max(adjustedWindowWidth, isFinite(minimalDx) ? (minimumAppointmentWidth / minimalDx) : adjustedWindowWidth);
        },
        drawAppointments = function example_drawAppointments() {
            var i;

            cleanAppointments();
            setScheduleWidth();

            for (i = 0; i < numberOfAppointments; ++i) {
                renderAppointment(i, tiling);
            }
        },
        generateRandomSchedule = function example_generateRandomSchedule() {
            var i;

            numberOfAppointments = parseInt(htmlElements.exampleNumberOfAppointmentsInput.value, 10);
            appointments = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                appointments.push(generateRandomAppointment());
            }

            tiling = window.calendarTiler.tileAppointments(appointments);
            appointments = tiling.sortedAppointments;

            drawAppointments();
        },
        fillGradientValues = function example_fillGradientValues() {
            var i;
            for (i = 0; i < numberOfSubdivisionsPerHour; ++i) {
                gradientValues[i] = '#' + (i % 2 === 0 ? 'f2f2f2' : 'e2e2e2');
            }
        },
        initialize = function example_initialize() {
            var i,
                subdivisionIndex,
                timeElement,
                appointmntInvervalElement;

            generateSubdivisions();
            fillGradientValues();

            for (i = 0; i < totalNumberOfSubdivisions; ++i) {
                subdivisionIndex = i % 4;
                timeElement = document.createElement('div');
                timeElement.classList.add('example-time');
                timeElement.innerHTML = getTimeText(i);
                timeElement.style.backgroundColor = gradientValues[subdivisionIndex];
                htmlElements.exampleTimes.appendChild(timeElement);

                appointmntInvervalElement = document.createElement('div');
                appointmntInvervalElement.classList.add(subdivisionIndex === 0 ? 'appointment-time' : 'appointment-time-interval');
                appointmntInvervalElement.style.backgroundColor = gradientValues[subdivisionIndex];
                htmlElements.exampleAppointments.appendChild(appointmntInvervalElement);

                if (i === 0) {
                    timeElement.classList.add('example-time-first');
                    appointmntInvervalElement.classList.add('appointment-time-interval-first');
                }
            }

            htmlElements.exampleNumberOfAppointmentsInput.value = numberOfAppointments;
            htmlElements.exampleNumberOfAppointmentsButton.onclick = generateRandomSchedule;
            generateRandomSchedule();
        };

    window.addEventListener('resize', drawAppointments);
    window.addEventListener('orientationchange', drawAppointments);

    initialize();
}());
