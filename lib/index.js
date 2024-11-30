const validator = require('validator');

module.exports = {
    validateForm(data) {
        const { cc = '', cvv = '', expire = '', amount = '' } = data;

        const errors = [];

        if(!validator.isCreditCard(cc)) {
            errors.push({
                param: 'cc',
                msg: 'Invalid credit card number.'
            });
        }

        if(!/^\d{3}$/.test(cvv)) {
            errors.push({
                param: 'cvv',
                msg: 'Invalid CVV code.'
            });
        }

        if(!/^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/.test(expire)) {
            errors.push({
                param: 'expire',
                msg: 'Invalid expiration date.'
            }); 
        }
		if(!validator.toString(amount)) {
			errors.push({
				param: 'amount',
				msg: 'Invalid amount.'
			}); 
		}


		return errors;
    },
    usPhoneNumberFormat(number) {
        let x = number.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);

        return !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    }
};