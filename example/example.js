/*global window, document, console*/
(function () {
    'use strict';

    var appointmentWidthModifier,
        appointments,
        tiling,
        hoursPerDay = 24,
        minutesPerHour = 60,
        numberOfSubdivisionsPerHour = 4,
        subdivisionHeight = 24,
        minimumAppointmentWidth = 30,
        numberOfAppointments = 20,
        totalNumberOfSubdivisions = hoursPerDay * numberOfSubdivisionsPerHour,
        subdivisions = {},
        tileParameters = {
            widthCalculationMethod: 'fillSpace',
            usesDuration: false,
            start: 'start',
            delineator: 'end'
        },
        gradientValues = [],
        htmlElements = {
            exampleTimes: document.getElementById('example-times'),
            exampleAppointments: document.getElementById('example-appointments'),
            exampleNumberOfAppointmentsInput: document.getElementById('example-number-of-appointments-input'),
            exampleNumberOfAppointmentsButton: document.getElementById('example-number-of-appointments-button'),
            exampleWidthCalculationMethodSelect: document.getElementById('example-width-calculation-method-select'),
            exampleSchedule: document.getElementById('example-schedule')
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
                end = Math.min(hoursPerDay, start + Math.max((Math.floor((Math.random() * remainingTime) + 1 / numberOfSubdivisionsPerHour)), (1 / numberOfSubdivisionsPerHour)));

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
            var positions = tiling.positions[index],
                appointment = document.createElement('div');

            appointment.classList.add('example-appointment');
            appointment.innerHTML = String(index + 1);
            appointment.style.height = (subdivisionHeight * numberOfSubdivisionsPerHour * positions.dy) - 4 + 'px';
            appointment.style.top = (positions.y * numberOfSubdivisionsPerHour * subdivisionHeight) + 2 + 'px';
            appointment.style.width =  (appointmentWidthModifier * positions.dx) - 4 + 'px';
            appointment.style.left = (appointmentWidthModifier * positions.x) + 2 + 'px';

            htmlElements.exampleAppointments.appendChild(appointment);
        },
        setScheduleWidth = function example_setAppointmentsWidth() {
            var i,
                minimalDx = Infinity,
                adjustedWindowWidth = window.innerWidth - 100;

            for (i = 0; i < numberOfAppointments; ++i) {
                if (tiling.positions[i].dx < minimalDx) {
                    minimalDx = tiling.positions[i].dx;
                }
            }

            appointmentWidthModifier = Math.max(adjustedWindowWidth, isFinite(minimalDx) ? (minimumAppointmentWidth / minimalDx) : adjustedWindowWidth);
        },
        tileAppointments = function example_tileAppointments() {
            tileParameters.widthCalculationMethod = htmlElements.exampleWidthCalculationMethodSelect.value;
            tiling = window.calendarTiler.tileAppointments(appointments, tileParameters);
        },
        renderAppointments = function example_renderAppointments(wasResized) {
            var i;

            cleanAppointments();
            setScheduleWidth();

            if (!wasResized) {
                tileAppointments();
            }

            for (i = 0; i < numberOfAppointments; ++i) {
                renderAppointment(i, tiling);
            }

            for (i = 0; i < totalNumberOfSubdivisions; ++i) {
                htmlElements.exampleAppointments.children[i].style.width = appointmentWidthModifier + 'px';
            }
        },
        drawAppointments = function example_drawAppointments() {
            renderAppointments();
        },
        reDrawAppointments = function example_reDrawAppointments() {
            renderAppointments(true);
        },
        generateRandomSchedule = function example_generateRandomSchedule() {
            var i;

            numberOfAppointments = parseInt(htmlElements.exampleNumberOfAppointmentsInput.value, 10);
            appointments = [];

            for (i = 0; i < numberOfAppointments; ++i) {
                appointments.push(generateRandomAppointment());
            }

            tileAppointments();
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

            timeElement = document.createElement('div');
            timeElement.classList.add('example-times-scroll-spacer');
            htmlElements.exampleTimes.appendChild(timeElement);

            htmlElements.exampleAppointments.addEventListener('scroll', function () {
                htmlElements.exampleTimes.scrollTop = htmlElements.exampleAppointments.scrollTop;
            });

            htmlElements.exampleNumberOfAppointmentsInput.value = numberOfAppointments;
            htmlElements.exampleWidthCalculationMethodSelect.value = tileParameters.widthCalculationMethod;
            htmlElements.exampleNumberOfAppointmentsButton.onclick = generateRandomSchedule;
            htmlElements.exampleWidthCalculationMethodSelect.onchange = drawAppointments;

            generateRandomSchedule();
        };

    window.addEventListener('resize', reDrawAppointments);
    window.addEventListener('orientationchange', reDrawAppointments);

    initialize();
}());
