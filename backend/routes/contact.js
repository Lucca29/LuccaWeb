const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting pour les formulaires de contact
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 tentatives par IP
    message: { error: 'Trop de tentatives d\'envoi, veuillez réessayer plus tard.' }
});

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'luccads.contact@gmail.com',
        pass: process.env.EMAIL_PASS // Mot de passe d'application Gmail
    }
});

// Route pour envoyer le formulaire de contact
router.post('/send', contactLimiter, async (req, res) => {
    try {
        const { name, email, phone, company, service, budget, message } = req.body;

        // Validation des champs requis
        if (!name || !email || !service || !message) {
            return res.status(400).json({
                error: 'Champs requis manquants',
                required: ['name', 'email', 'service', 'message']
            });
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Format d\'email invalide'
            });
        }

        // Préparation du contenu de l'email
        const emailContent = `
            <h2>Nouveau message de contact - Agence Lucca</h2>
            
            <h3>Informations du contact :</h3>
            <p><strong>Nom :</strong> ${name}</p>
            <p><strong>Email :</strong> ${email}</p>
            ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ''}
            ${company ? `<p><strong>Entreprise :</strong> ${company}</p>` : ''}
            
            <h3>Détails du projet :</h3>
            <p><strong>Service souhaité :</strong> ${service}</p>
            ${budget ? `<p><strong>Budget :</strong> ${budget}</p>` : ''}
            
            <h3>Message :</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
            
            <hr>
            <p><em>Message envoyé depuis le formulaire de contact du site Agence Lucca</em></p>
            <p><em>Date : ${new Date().toLocaleString('fr-FR')}</em></p>
        `;

        // Configuration de l'email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'luccads.contact@gmail.com',
            to: 'luccads.contact@gmail.com',
            subject: `Nouveau contact - ${name} - ${service}`,
            html: emailContent,
            replyTo: email
        };

        // Envoi de l'email
        await transporter.sendMail(mailOptions);

        // Email de confirmation au client
        const confirmationContent = `
            <h2>Merci pour votre message !</h2>
            
            <p>Bonjour ${name},</p>
            
            <p>Nous avons bien reçu votre demande concernant <strong>${service}</strong> et nous vous remercions de l'intérêt que vous portez à nos services.</p>
            
            <p>Notre équipe va étudier votre projet avec attention et vous recontactera dans les plus brefs délais (sous 48h).</p>
            
            <h3>Récapitulatif de votre demande :</h3>
            <p><strong>Service :</strong> ${service}</p>
            ${budget ? `<p><strong>Budget :</strong> ${budget}</p>` : ''}
            
            <p>En attendant notre retour, n'hésitez pas à consulter nos réalisations sur notre site.</p>
            
            <p>Cordialement,<br>
            L'équipe Lucca</p>
            
            <hr>
            <p><em>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</em></p>
        `;

        const confirmationMail = {
            from: process.env.EMAIL_USER || 'luccads.contact@gmail.com',
            to: email,
            subject: 'Confirmation de votre demande - Agence Lucca',
            html: confirmationContent
        };

        await transporter.sendMail(confirmationMail);

        res.json({
            success: true,
            message: 'Votre message a été envoyé avec succès !'
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi du formulaire de contact:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'envoi du message',
            message: 'Veuillez réessayer plus tard ou nous contacter directement.'
        });
    }
});

module.exports = router; 