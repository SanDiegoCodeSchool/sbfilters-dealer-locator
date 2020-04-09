require('dotenv').config();
var nodemailer = require('nodemailer');

module.exports = (formObject) => {
  // create the message header
  var message = 'New Dealer Registration\n------------------------'

  // add all of the form fields
  Object.entries(formObject).forEach(
    formField => message += `\n${formField[0]}: ${formField[1]}`
  );

  // initialize transport object with email credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

  // configure the message
  const mailOptions = {
    from: 'sbdealerform@gmail.com', // sender address, gmail account created for now
    to: process.env.SENDTO, // will eventually be the SB filters address, possibly their servicedesk account
    subject: 'New Dealer Registration', 
    text: message
  };

  // send the message, listen for error
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 

}