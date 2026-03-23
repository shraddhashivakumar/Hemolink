const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

/* ============================= */
/* DATABASE CONNECTION */
/* ============================= */

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hemolink'
});

db.connect(err => {
    if (err) console.error('Database connection failed:', err);
    else console.log('Connected to MySQL Database ❤️');
});

/* ============================= */
/* HOME ROUTE */
/* ============================= */

app.get('/', (req, res) => {
    res.send('Hemolink Backend Running 🚑');
});

/* ============================= */
/* REGISTER DONOR */
/* ============================= */

app.post('/api/donors', (req, res) => {

    const { full_name, email, phone, blood_type, address, latitude, longitude } = req.body;

    const sql = `
        INSERT INTO donors (full_name, email, phone, blood_type, address, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [full_name, email, phone, blood_type, address, latitude, longitude], (err) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error registering donor' });
        }

        res.json({ message: 'Donor registered successfully ❤️' });
    });
});

/* ============================= */
/* BLOOD REQUEST + AUTO MATCH */
/* ============================= */

app.post('/api/requests', (req, res) => {

    const { requester_name, contact_info, blood_type, reason, address, latitude, longitude } = req.body;

    const insertSql = `
        INSERT INTO requests (requester_name, contact_info, blood_type, reason, address, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [requester_name, contact_info, blood_type, reason, address, latitude, longitude], (err) => {

        if (err) return res.status(500).json({ message: 'Error sending request' });

        // Find matching donors
        const donorSql = "SELECT * FROM donors WHERE blood_type = ?";

        db.query(donorSql, [blood_type], (err, donors) => {

            if (err) return res.status(500).json({ message: "Error finding donors" });

            let nearbyDonors = [];

            donors.forEach(donor => {

                const distance = getDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    parseFloat(donor.latitude),
                    parseFloat(donor.longitude)
                );

                if (distance <= 10) {
                    nearbyDonors.push({
                        ...donor,
                        distance_km: distance.toFixed(2)
                    });
                }
            });

            res.json({
                message: "Request submitted successfully 🩸",
                matched_donors: nearbyDonors
            });
        });
    });
});

/* ============================= */
/* CONTACT DONOR (SAVE + EMAIL) */
/* ============================= */

app.post("/api/contact-donor", (req, res) => {

    const { donor_id, requester_name, contact_info, blood_type, message } = req.body;

    // Save notification
    const insertSql = `
        INSERT INTO donor_notifications 
        (donor_id, requester_name, contact_info, blood_type, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [donor_id, requester_name, contact_info, blood_type, message], (err) => {

        if (err) return res.status(500).json({ message: "Failed to notify donor" });

        // Get donor email
        const sql = "SELECT full_name, email FROM donors WHERE id = ?";

        db.query(sql, [donor_id], async (err, result) => {

            if (err || result.length === 0)
                return res.json({ message: "Request saved but donor email not found" });

            const donor = result[0];

            /* ===== EMAIL TRANSPORT ===== */

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "ss0399@srmist.edu.in",
                    pass: "wcvrmppnuhonapih"
                }
            });

            try {

                await transporter.sendMail({
                    from: `"Hemolink 🩸" <ss0399@srmist.edu.in>`,
                    to: donor.email,
                    subject: `Urgent Blood Request (${blood_type})`,
                    html: `
                        <h2>Emergency Blood Request 🩸</h2>
                        <p><b>${requester_name}</b> requires <b>${blood_type}</b> blood.</p>
                        <p><b>Contact:</b> ${contact_info}</p>
                        <p><b>Message:</b> ${message}</p>
                        <br>
                        <p>Please respond if available.</p>
                    `
                });

                res.json({ message: `Request sent to ${donor.full_name} 📧` });

            } catch (error) {
                console.error(error);
                res.json({ message: "Request saved but email failed ❌" });
            }
        });
    });
});

/* ============================= */
/* GET DONORS */
/* ============================= */

app.get('/api/donors', (req, res) => {

    const bloodType = req.query.blood_type;

    let sql = "SELECT * FROM donors";
    let values = [];

    if (bloodType) {
        sql += " WHERE blood_type = ?";
        values.push(bloodType);
    }

    db.query(sql, values, (err, results) => {

        if (err) return res.status(500).json({ message: "Error fetching donors" });

        res.json(results);
    });
});

/* ============================= */
/* HAVERSINE DISTANCE */
/* ============================= */

function getDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/* ============================= */
/* START SERVER */
/* ============================= */

app.listen(5000, () => {
    console.log('Server running on port 5000 🚀');
});
