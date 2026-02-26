// // server.js - Simple Express server with Stripe Checkout, Payment Intents, and Webhooks
// const express = require('express');
// const cors = require('cors');
// const Stripe = require('stripe');

// // Initialize Express
// const app = express();

// // Initialize Stripe with your test key
// const stripe = new Stripe('sk_test_51T4fwyEeXHx7jwBMgR5AXst8QHk4AqPi70Aa0K1eFfoQS7wRaDyBWIk4deQrItTfRupVDt2CaKNlDG5AGUfj4OHZ00oMaYxAed');

// // Middleware - IMPORTANT: Raw body for webhook signature verification
// app.use(cors({
//     origin: 'http://localhost:5173',
//     credentials: true
// }));

// // Regular JSON middleware for all routes except webhook
// app.use((req, res, next) => {
//     if (req.originalUrl === '/api/webhook') {
//         next(); // Skip express.json() for webhook route
//     } else {
//         express.json()(req, res, next);
//     }
// });

// // ==================== CREATE CHECKOUT SESSION ====================
// app.post('/api/create-checkout-session', async (req, res) => {
//     try {
//         const { planId, billingPeriod, userData, serviceHours } = req.body;

//         if (!planId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Plan ID is required'
//             });
//         }

//         // Plan definitions with hardcoded prices
//         const plans = {
//             // Subscription plans
//             standard: {
//                 name: 'Standard Plan',
//                 type: 'subscription',
//                 monthly: { price: 9900 }, // $99
//                 yearly: { price: 95000 }   // $950
//             },
//             'enterprise-core': {
//                 name: 'Enterprise Core Plan',
//                 type: 'subscription',
//                 monthly: { price: 29900 }, // $299
//                 yearly: { price: 299000 }  // $2990
//             },
//             'enterprise-integration': {
//                 name: 'Enterprise Integration Plan',
//                 type: 'subscription',
//                 monthly: { price: 59900 }, // $599
//                 yearly: { price: 599000 }  // $5990
//             },
//             // Implementation services
//             'technical': {
//                 name: 'Technical Implementation',
//                 type: 'one_time',
//                 hourlyRate: 3000 // $30/hour
//             },
//             'functional': {
//                 name: 'Functional Implementation',
//                 type: 'one_time',
//                 hourlyRate: 2500 // $25/hour
//             },
//             'ai': {
//                 name: 'AI-Efficiency Enhancements',
//                 type: 'one_time',
//                 hourlyRate: 1500 // $15/hour
//             }
//         };

//         // Handle free plan
//         if (planId === 'starter') {
//             return res.json({
//                 success: true,
//                 isFree: true,
//                 redirect: '/signup?plan=starter'
//             });
//         }

//         const plan = plans[planId];
//         if (!plan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Plan not found'
//             });
//         }

//         // Create line items based on plan type
//         let line_items = [];

//         if (plan.type === 'one_time') {
//             // Implementation service
//             const hours = serviceHours || 10;
//             const total = plan.hourlyRate * hours;

//             line_items.push({
//                 price_data: {
//                     currency: 'usd',
//                     product_data: {
//                         name: plan.name,
//                         description: `${hours} hours of service`
//                     },
//                     unit_amount: total
//                 },
//                 quantity: 1
//             });
//         } else {
//             // Subscription
//             const selectedBilling = plan[billingPeriod || 'monthly'];

//             line_items.push({
//                 price_data: {
//                     currency: 'usd',
//                     product_data: {
//                         name: plan.name,
//                         description: `${billingPeriod || 'monthly'} subscription`
//                     },
//                     unit_amount: selectedBilling.price,
//                     recurring: {
//                         interval: billingPeriod === 'yearly' ? 'year' : 'month'
//                     }
//                 },
//                 quantity: 1
//             });
//         }

//         // Create checkout session
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             line_items: line_items,
//             mode: plan.type === 'one_time' ? 'payment' : 'subscription',
//             success_url: 'http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
//             cancel_url: 'http://localhost:3000/pricing',
//             customer_email: userData?.email,
//             metadata: {
//                 planId,
//                 userName: userData?.name || '',
//                 userCompany: userData?.company || ''
//             }
//         });

//         res.json({
//             success: true,
//             sessionId: session.id,
//             url: session.url
//         });

//     } catch (error) {
//         console.error('Error:', error.message);
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // ==================== CREATE PAYMENT INTENT ====================
// app.post('/api/create-payment-intent', async (req, res) => {
//     try {
//         const { amount, currency = 'usd', metadata = {} } = req.body;

//         if (!amount || amount <= 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Valid amount is required'
//             });
//         }

//         // Create a PaymentIntent
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: amount,
//             currency: currency,
//             metadata: metadata,
//             automatic_payment_methods: {
//                 enabled: true,
//             },
//         });

//         res.json({
//             success: true,
//             clientSecret: paymentIntent.client_secret,
//             paymentIntentId: paymentIntent.id
//         });

//     } catch (error) {
//         console.error('Error creating payment intent:', error.message);
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // ==================== CONFIRM PAYMENT INTENT ====================
// app.post('/api/confirm-payment-intent', async (req, res) => {
//     try {
//         const { paymentIntentId } = req.body;

//         if (!paymentIntentId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Payment Intent ID is required'
//             });
//         }

//         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//         res.json({
//             success: true,
//             status: paymentIntent.status,
//             amount: paymentIntent.amount,
//             metadata: paymentIntent.metadata
//         });

//     } catch (error) {
//         console.error('Error confirming payment intent:', error.message);
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // ==================== VERIFY PAYMENT ====================
// app.post('/api/verify-payment', async (req, res) => {
//     try {
//         const { sessionId, paymentIntentId } = req.body;

//         if (!sessionId && !paymentIntentId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Session ID or Payment Intent ID required'
//             });
//         }

//         let paymentData = {};

//         if (sessionId) {
//             const session = await stripe.checkout.sessions.retrieve(sessionId);
//             paymentData = {
//                 paid: session.payment_status === 'paid',
//                 customerEmail: session.customer_details?.email,
//                 amount: session.amount_total,
//                 planId: session.metadata?.planId,
//                 type: 'checkout_session'
//             };
//         } else if (paymentIntentId) {
//             const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//             paymentData = {
//                 paid: paymentIntent.status === 'succeeded',
//                 customerEmail: paymentIntent.receipt_email,
//                 amount: paymentIntent.amount,
//                 metadata: paymentIntent.metadata,
//                 type: 'payment_intent'
//             };
//         }

//         res.json({
//             success: true,
//             ...paymentData
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // ==================== WEBHOOK ====================
// // This endpoint handles Stripe webhook events
// app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     const endpointSecret = 'whsec_your_webhook_signing_secret'; // Replace with your actual webhook secret

//     let event;

//     try {
//         // Verify the webhook signature
//         event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//         console.log(`⚠️ Webhook signature verification failed.`, err.message);
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // Handle the event
//     switch (event.type) {
//         case 'payment_intent.succeeded':
//             const paymentIntent = event.data.object;
//             console.log(`✅ PaymentIntent succeeded: ${paymentIntent.id}`);
//             // Handle successful payment here
//             // e.g., update database, send email, provision service
//             break;

//         case 'payment_intent.payment_failed':
//             const failedPayment = event.data.object;
//             console.log(`❌ PaymentIntent failed: ${failedPayment.id}`);
//             // Handle failed payment here
//             break;

//         case 'checkout.session.completed':
//             const session = event.data.object;
//             console.log(`✅ Checkout session completed: ${session.id}`);
//             // Handle completed checkout here
//             // For subscriptions, you might want to create a customer record
//             break;

//         case 'customer.subscription.created':
//             const subscription = event.data.object;
//             console.log(`✅ Subscription created: ${subscription.id}`);
//             // Handle new subscription
//             break;

//         case 'customer.subscription.updated':
//             const updatedSubscription = event.data.object;
//             console.log(`🔄 Subscription updated: ${updatedSubscription.id}`);
//             // Handle subscription update
//             break;

//         case 'customer.subscription.deleted':
//             const deletedSubscription = event.data.object;
//             console.log(`❌ Subscription deleted: ${deletedSubscription.id}`);
//             // Handle subscription cancellation
//             break;

//         default:
//             console.log(`Unhandled event type ${event.type}`);
//     }

//     // Return a response to acknowledge receipt of the event
//     res.json({ received: true });
// });

// // ==================== GET PAYMENT INTENT STATUS ====================
// app.get('/api/payment-intent/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const paymentIntent = await stripe.paymentIntents.retrieve(id);

//         res.json({
//             success: true,
//             status: paymentIntent.status,
//             amount: paymentIntent.amount,
//             metadata: paymentIntent.metadata
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // ==================== HEALTH CHECK ====================
// app.get('/api/health', (req, res) => {
//     res.json({
//         status: 'ok',
//         message: 'Server is running'
//     });
// });

// // ==================== START SERVER ====================
// const PORT = 5000;
// app.listen(PORT, () => {
//     console.log(`✅ Server running at http://localhost:${PORT}`);
//     console.log(`📡 API endpoints:`);
//     console.log(`   POST /api/create-checkout-session`);
//     console.log(`   POST /api/create-payment-intent`);
//     console.log(`   POST /api/confirm-payment-intent`);
//     console.log(`   POST /api/verify-payment`);
//     console.log(`   GET  /api/payment-intent/:id`);
//     console.log(`   POST /api/webhook`);
//     console.log(`   GET  /api/health`);
// });

// server.js - Simple Express server with Stripe Checkout, Payment Intents, Webhooks, and Email Notifications
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');

// Initialize Express
const app = express();

// Initialize Stripe with your test key
const stripe = new Stripe('sk_test_51T4fwyEeXHx7jwBMgR5AXst8QHk4AqPi70Aa0K1eFfoQS7wRaDyBWIk4deQrItTfRupVDt2CaKNlDG5AGUfj4OHZ00oMaYxAed');

// Email configuration
const emailConfig = {
    host: 'smtp.gmail.com', // or your email provider's SMTP server
    port: 587,
    secure: false,
    auth: {
        user: 'abdullah.320409@gmail.com', // Replace with your email
        pass: 'hbjvvvwoguoekpxo'
    }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify email connection
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email server connection error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Email templates
const emailTemplates = {
    paymentSuccess: (data) => ({
        subject: `✅ Payment Confirmed - ${data.planName || 'Your Purchase'}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Payment Successful!</h2>
        <p>Dear ${data.customerName || 'Valued Customer'},</p>
        <p>Thank you for your payment. Your transaction has been completed successfully.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <p><strong>Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
          <p><strong>Plan:</strong> ${data.planName || 'N/A'}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>You can access your account and manage your subscription at any time.</p>
        
        <a href="http://localhost:5173/dashboard" 
           style="background-color: #10b981; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Go to Dashboard
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `
    }),

    subscriptionCreated: (data) => ({
        subject: `🔄 Subscription Activated - ${data.planName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Subscription Activated!</h2>
        <p>Dear ${data.customerName || 'Valued Customer'},</p>
        <p>Your subscription has been successfully activated.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details</h3>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Billing Period:</strong> ${data.billingPeriod || 'Monthly'}</p>
          <p><strong>Amount:</strong> $${(data.amount / 100).toFixed(2)}/${data.billingPeriod === 'yearly' ? 'year' : 'month'}</p>
          <p><strong>Subscription ID:</strong> ${data.subscriptionId}</p>
          <p><strong>Start Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>Your next billing date will be ${data.nextBillingDate || 'in one month'}.</p>
        
        <a href="http://localhost:5173/dashboard/subscription" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Manage Subscription
        </a>
      </div>
    `
    }),

    paymentFailed: (data) => ({
        subject: `❌ Payment Failed - Action Required`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Payment Failed</h2>
        <p>Dear ${data.customerName || 'Valued Customer'},</p>
        <p>We were unable to process your payment of $${(data.amount / 100).toFixed(2)}.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Failed Payment Details</h3>
          <p><strong>Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
          <p><strong>Plan:</strong> ${data.planName || 'N/A'}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>Please update your payment method to continue using our services without interruption.</p>
        
        <a href="http://localhost:5173/dashboard/billing" 
           style="background-color: #ef4444; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Update Payment Method
        </a>
      </div>
    `
    }),

    subscriptionCancelled: (data) => ({
        subject: `🔄 Subscription Cancelled - ${data.planName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Subscription Cancelled</h2>
        <p>Dear ${data.customerName || 'Valued Customer'},</p>
        <p>Your subscription has been cancelled as requested.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Cancellation Details</h3>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Subscription ID:</strong> ${data.subscriptionId}</p>
          <p><strong>Cancellation Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Access Until:</strong> ${data.accessUntil || 'End of billing period'}</p>
        </div>
        
        <p>We're sorry to see you go. You can resubscribe at any time.</p>
        
        <a href="http://localhost:5173/pricing" 
           style="background-color: #10b981; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Plans
        </a>
      </div>
    `
    }),

    adminNotification: (data) => ({
        subject: `💰 New Payment Received - $${(data.amount / 100).toFixed(2)}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Payment Received</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Transaction Details</h3>
          <p><strong>Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
          <p><strong>Customer:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.customerEmail}</p>
          <p><strong>Plan:</strong> ${data.planName || 'N/A'}</p>
          <p><strong>Type:</strong> ${data.paymentType || 'One-time'}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <a href="http://localhost:5173/admin/payments/${data.transactionId}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          View in Dashboard
        </a>
      </div>
    `
    })
};

// Helper function to send email
async function sendEmail(to, template, data) {
    try {
        const mailOptions = {
            from: '"Your Company Name" <noreply@yourcompany.com>',
            to: to,
            ...template(data)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}:`, info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
}

// Middleware - IMPORTANT: Raw body for webhook signature verification
app.use(cors({
    origin: 'https://nerdybuddy-web.vercel.app',
    credentials: true
}));

// Regular JSON middleware for all routes except webhook
app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhook') {
        next(); // Skip express.json() for webhook route
    } else {
        express.json()(req, res, next);
    }
});

// ==================== CREATE CHECKOUT SESSION ====================
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { planId, billingPeriod, userData, serviceHours } = req.body;

        if (!planId) {
            return res.status(400).json({
                success: false,
                message: 'Plan ID is required'
            });
        }

        // Plan definitions with hardcoded prices
        const plans = {
            // Subscription plans
            standard: {
                name: 'Standard Plan',
                type: 'subscription',
                monthly: { price: 9900 }, // $99
                yearly: { price: 95000 }   // $950
            },
            'enterprise-core': {
                name: 'Enterprise Core Plan',
                type: 'subscription',
                monthly: { price: 29900 }, // $299
                yearly: { price: 299000 }  // $2990
            },
            'enterprise-integration': {
                name: 'Enterprise Integration Plan',
                type: 'subscription',
                monthly: { price: 59900 }, // $599
                yearly: { price: 599000 }  // $5990
            },
            // Implementation services
            'technical': {
                name: 'Technical Implementation',
                type: 'one_time',
                hourlyRate: 3000 // $30/hour
            },
            'functional': {
                name: 'Functional Implementation',
                type: 'one_time',
                hourlyRate: 2500 // $25/hour
            },
            'ai': {
                name: 'AI-Efficiency Enhancements',
                type: 'one_time',
                hourlyRate: 1500 // $15/hour
            }
        };

        // Handle free plan
        if (planId === 'starter') {
            return res.json({
                success: true,
                isFree: true,
                redirect: '/signup?plan=starter'
            });
        }

        const plan = plans[planId];
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // Create line items based on plan type
        let line_items = [];

        if (plan.type === 'one_time') {
            // Implementation service
            const hours = serviceHours || 10;
            const total = plan.hourlyRate * hours;

            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: plan.name,
                        description: `${hours} hours of service`
                    },
                    unit_amount: total
                },
                quantity: 1
            });
        } else {
            // Subscription
            const selectedBilling = plan[billingPeriod || 'monthly'];

            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: plan.name,
                        description: `${billingPeriod || 'monthly'} subscription`
                    },
                    unit_amount: selectedBilling.price,
                    recurring: {
                        interval: billingPeriod === 'yearly' ? 'year' : 'month'
                    }
                },
                quantity: 1
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: plan.type === 'one_time' ? 'payment' : 'subscription',
            success_url: 'http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost:3000/pricing',
            customer_email: userData?.email,
            metadata: {
                planId,
                planName: plan.name,
                userName: userData?.name || '',
                userCompany: userData?.company || '',
                billingPeriod: billingPeriod || 'monthly'
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== CREATE PAYMENT INTENT ====================
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'usd', metadata = {} } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            metadata: metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Error creating payment intent:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== CONFIRM PAYMENT INTENT ====================
app.post('/api/confirm-payment-intent', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment Intent ID is required'
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.json({
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata
        });

    } catch (error) {
        console.error('Error confirming payment intent:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== VERIFY PAYMENT ====================
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { sessionId, paymentIntentId } = req.body;

        if (!sessionId && !paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID or Payment Intent ID required'
            });
        }

        let paymentData = {};

        if (sessionId) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            paymentData = {
                paid: session.payment_status === 'paid',
                customerEmail: session.customer_details?.email,
                amount: session.amount_total,
                planId: session.metadata?.planId,
                type: 'checkout_session'
            };
        } else if (paymentIntentId) {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            paymentData = {
                paid: paymentIntent.status === 'succeeded',
                customerEmail: paymentIntent.receipt_email,
                amount: paymentIntent.amount,
                metadata: paymentIntent.metadata,
                type: 'payment_intent'
            };
        }

        res.json({
            success: true,
            ...paymentData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== SEND MANUAL EMAIL ====================
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, templateType, data } = req.body;

        if (!to || !templateType || !data) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to, templateType, data'
            });
        }

        if (!emailTemplates[templateType]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid template type'
            });
        }

        await sendEmail(to, emailTemplates[templateType], data);

        res.json({
            success: true,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== WEBHOOK ====================
// This endpoint handles Stripe webhook events
// Update the webhook handler to send comprehensive receipt
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = 'whsec_your_webhook_signing_secret'; // Replace with your actual webhook secret

    let event;

    try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log(`✅ PaymentIntent succeeded: ${paymentIntent.id}`);

                // Get customer details from metadata or retrieve from Stripe
                const customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.email;
                const customerName = paymentIntent.metadata?.userName || 'Valued Customer';
                const company = paymentIntent.metadata?.userCompany || 'N/A';
                const planName = paymentIntent.metadata?.planName || 'Payment';
                const billingPeriod = paymentIntent.metadata?.billingPeriod || 'One-time';

                // Calculate next billing date for subscriptions
                let nextBillingDate = null;
                if (billingPeriod !== 'One-time') {
                    const nextDate = new Date();
                    if (billingPeriod === 'yearly') {
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                    } else if (billingPeriod === 'monthly') {
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    }
                    nextBillingDate = nextDate.toLocaleDateString();
                }

                // Send comprehensive receipt email to customer
                if (customerEmail) {
                    await sendEmail(
                        customerEmail,
                        emailTemplates.paymentReceipt,
                        {
                            customerName: customerName,
                            customerEmail: customerEmail,
                            company: company,
                            amount: paymentIntent.amount,
                            planName: planName,
                            planId: paymentIntent.metadata?.planId || 'N/A',
                            billingPeriod: billingPeriod,
                            transactionId: paymentIntent.id,
                            paymentDate: new Date().toLocaleString(),
                            paymentMethod: 'Credit Card',
                            receiptUrl: `https://dashboard.stripe.com/payments/${paymentIntent.id}`,
                            features: [], // You can fetch features from your database based on planId
                            nextBillingDate: nextBillingDate,
                            supportEmail: 'support@yourcompany.com',
                            companyWebsite: 'https://yourcompany.com'
                        }
                    );
                    console.log(`✅ Receipt email sent to ${customerEmail}`);
                }

                // Send admin notification
                await sendEmail(
                    'admin@yourcompany.com', // Replace with admin email
                    emailTemplates.adminNotification,
                    {
                        customerName: customerName,
                        customerEmail: customerEmail || 'N/A',
                        company: company,
                        amount: paymentIntent.amount,
                        planName: planName,
                        paymentType: billingPeriod,
                        transactionId: paymentIntent.id,
                        paymentDate: new Date().toLocaleString(),
                        stripeDashboard: `https://dashboard.stripe.com/payments/${paymentIntent.id}`,
                        customerPortal: `https://yourcompany.com/admin/customers?email=${encodeURIComponent(customerEmail || '')}`
                    }
                );
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log(`❌ PaymentIntent failed: ${failedPayment.id}`);

                // Send failure notification to customer
                if (failedPayment.receipt_email || failedPayment.metadata?.email) {
                    await sendEmail(
                        failedPayment.receipt_email || failedPayment.metadata?.email,
                        emailTemplates.paymentFailed,
                        {
                            customerName: failedPayment.metadata?.userName || 'Valued Customer',
                            amount: failedPayment.amount,
                            planName: failedPayment.metadata?.planName || 'Payment',
                            transactionId: failedPayment.id
                        }
                    );
                }
                break;

            case 'checkout.session.completed':
                const session = event.data.object;
                console.log(`✅ Checkout session completed: ${session.id}`);

                // Handle completed checkout
                if (session.customer_email) {
                    // You might want to send a different email for checkout sessions
                    // or just rely on payment_intent.succeeded
                    console.log(`Checkout completed for: ${session.customer_email}`);
                }
                break;

            case 'customer.subscription.created':
                const subscription = event.data.object;
                console.log(`✅ Subscription created: ${subscription.id}`);

                // Get customer details
                const customer = await stripe.customers.retrieve(subscription.customer);

                // Send subscription confirmation email
                if (customer.email) {
                    await sendEmail(
                        customer.email,
                        emailTemplates.subscriptionCreated,
                        {
                            customerName: customer.name || 'Valued Customer',
                            planName: subscription.metadata?.planName || 'Subscription',
                            amount: subscription.items.data[0].price.unit_amount,
                            billingPeriod: subscription.items.data[0].price.recurring.interval,
                            subscriptionId: subscription.id,
                            nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString()
                        }
                    );
                }
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                console.log(`🔄 Subscription updated: ${updatedSubscription.id}`);
                // Handle subscription update
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                console.log(`❌ Subscription deleted: ${deletedSubscription.id}`);

                // Get customer details
                const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer);

                // Send cancellation email
                if (deletedCustomer.email) {
                    await sendEmail(
                        deletedCustomer.email,
                        emailTemplates.subscriptionCancelled,
                        {
                            customerName: deletedCustomer.name || 'Valued Customer',
                            planName: deletedSubscription.metadata?.planName || 'Subscription',
                            subscriptionId: deletedSubscription.id,
                            accessUntil: new Date(deletedSubscription.current_period_end * 1000).toLocaleDateString()
                        }
                    );
                }
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error processing webhook event:', error);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
});

// ==================== GET PAYMENT INTENT STATUS ====================
app.get('/api/payment-intent/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const paymentIntent = await stripe.paymentIntents.retrieve(id);

        res.json({
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running'
    });
});

// ==================== START SERVER ====================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST /api/create-checkout-session`);
    console.log(`   POST /api/create-payment-intent`);
    console.log(`   POST /api/confirm-payment-intent`);
    console.log(`   POST /api/verify-payment`);
    console.log(`   POST /api/send-email`);
    console.log(`   GET  /api/payment-intent/:id`);
    console.log(`   POST /api/webhook`);
    console.log(`   GET  /api/health`);
});