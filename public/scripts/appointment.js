"use strict";

$(function() {
    const setMonthlyReapeatDay = date => {
        const newDate = date.clone().add( 1, 'months' );
        const repeatDay = newDate.date(); // Current day
        const days = newDate.daysInMonth(); // Total number of days in the month
        // const repeatDay = date.month() == 1 && date.daysInMonth() == 28 ? 28 : ( day + 1 > days ? day : day + 1 );
        const ordinalValue = moment.localeData().ordinal( repeatDay ); // Ordinal value of date

        $( '.repeat-monthly .repeat-day' ).html( `${ordinalValue} <input type="hidden" name="repeatDay" value="${repeatDay}">` );
    }

    $('#repeatAtn').change( e => {
        e.preventDefault();

        $( '.repeat-type, .repeating-toggle' ).toggleClass( "d-none", ! $(e.target).prop( "checked" ) );

        return false;
    } );

    $('#repeatType').change( e => {
        e.preventDefault();
        const checked = $(e.target).prop( "checked" );

        $( '.repeating-days, .repeat-weekly' ).toggleClass( "d-none", checked );
        $( '.repeating-day, .repeat-monthly' ).toggleClass( "d-none", ! checked );

        return false;
    } );

    $('form.appointment-form').submit( e => {
        const form = $(e.target);
        const repeatAtn = form.find( '#repeatAtn' ).is( ":checked" );
        const repeatType = form.find( '#repeatType' ).is( ":checked" );
        const appointmentDays = form.find( '[name="appointmentDays"]' );

        if ( repeatAtn && ! repeatType ) {
            let hasCheck = false;

            appointmentDays.each( (index, el) => {
                if ( ! $(el).is( ":checked" ) ) return true;

                hasCheck = true;

                return false;
            } );

            if ( ! hasCheck ) {
                e.preventDefault();

                Swal.fire({
                    text: 'Please select at least one weekday.',
                    icon: 'error'
                });
            }
        }
    } );

    $(window).on( 'load', () => setMonthlyReapeatDay( moment() ) );

    $('input[name="appointmentTime"]').blur( e => {
        const elm = $(e.target);
        const value = elm.val();
        const date = moment(value, 'MM-DD-YYYY hh:mma');

        setMonthlyReapeatDay( date );
    } );
});