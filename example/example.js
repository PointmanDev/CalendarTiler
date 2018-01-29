/*global window, document, console*/
(function () {
    'use strict';

    var hoursPerDay = 24,
        minutesPerHour = 60,
        numberOfSubdivisionsPerHour = 4,
        totalNumberOfSubdivisions = hoursPerDay * numberOfSubdivisionsPerHour,
        htmlElements = {
            exampleTimes: document.getElementById('example-times'),
            exampleAppointments: document.getElementById('example-appointments'),
            exampleNumberOfAppointmentsInput: document.getElementById('example-number-of-appointments-input'),
            exampleNumberOfAppointmentsButton: document.getElementById('example-number-of-appointments-button')
        },
        subdivisions = {},
        gradientValues = [],
        scheduleWidth,
        defaultAppointmentHeight = 20,
        appointments,
        numberOfAppointments = 20,
        tiling,
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
        renderAppointment = function example_renderAppointment(index, tiling) {
            var appointment = document.createElement('div');

            appointment.classList.add('example-appointment');
            appointment.innerHTML = String(index);
            appointment.style.height = (defaultAppointmentHeight * numberOfSubdivisionsPerHour * tiling.dy[index]) + 'px';
            appointment.style.top = (tiling.y[index] * numberOfSubdivisionsPerHour * defaultAppointmentHeight) + 'px';
            appointment.style.width = (Math.floor(scheduleWidth * tiling.dx[index])) + 'px';
            appointment.style.left = (scheduleWidth * tiling.x[index]) + 'px';
            htmlElements.exampleAppointments.appendChild(appointment);
        },
        setScheduleWidth = function example_setAppointmentsWidth() {
            scheduleWidth = Math.max(window.innerWidth - 100, 500);
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
                gradientValues[i] = '#' + (i % 2 === 0 ? 'ffffff' : 'f2f2f2');
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
