const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser'); // You can remove bodyParser if you're using express.json and express.urlencoded
const cors = require('cors');
const app = express();
const port = 3001;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');



// Configure the PostgreSQL client
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'world',
    password: 'dolphin',
    port: 5432,
});

const storage = multer.memoryStorage(); // Store in memory
const upload = multer({ storage: storage });
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true // If you need to include credentials like cookies in requests
}));

// Increase the payload limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Define your routes
app.get('/', (req, res) => {
    res.send('Welcome to the server!');
});


app.post('/api/signup', async (req, res) => {
    const { fullname, mobileno, email, password, village, state, district, aadharid, profile_pic, dob, pswRepeat } = req.body;

    // Basic validation
    if (!fullname || !mobileno || !email || !password || !village || !state || !district || !aadharid || !dob) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if passwords match
    if (password !== pswRepeat) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        // Check profile picture format if it's provided
        if (profile_pic) {
            const isBase64 = /^data:image\/[a-zA-Z]+;base64,/.test(profile_pic);
            if (!isBase64) {
                return res.status(400).json({ error: 'Invalid profile picture format' });
            }
        }

        // Insert user data into the users table
        const result = await pool.query(
            'INSERT INTO users (fullname, mobileno, email, password, village, state, district, aadharid, profile_pic, dob) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [fullname, mobileno, email, password, village, state, district, aadharid, profile_pic, dob]
        );

        // Respond to the client immediately after successful user data insertion
        res.status(201).json(result.rows[0]);

        // Setup Nodemailer transporter with Gmail (ensure you're using the correct credentials)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'adiapa746103gupta@gmail.com', // Your email address
                pass: 'izqr qsyj zfnm rwya' // App-specific password for Gmail
            }
        });

        // Email options
        const mailOptions = {
            from: 'adiapa746103gupta@gmail.com',
            to: email, // Send to the user's email
            subject: 'Welcome to Our Platform',
            text: `Hi ${fullname},\n\nThank you for signing up on our platform!\n\nBest regards,\nYour Company`
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                // Optional: you can log this to your system or retry email logic here.
            } else {
                console.log('Email sent:', info.response);
            }
        });

    } catch (err) {
        console.error('Error inserting user data:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query to check user credentials
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);

        // If user is found, return their data
        if (result.rows.length > 0) {
            return res.status(200).json(result.rows[0]);
        } else {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/update', async (req, res) => {
    const { aadharid, fullname, mobileno, email, village, state, district, profile_pic } = req.body;

    // Check if aadharid is provided
    if (!aadharid) {
        return res.status(400).json({ message: 'Aadhar ID is required' });
    }

    try {
        // Update query to handle updating all fields, including profile_pic
        const query = `
            UPDATE users
            SET
                fullname = $1,
                mobileno = $2,
                email = $3,
                village = $4,
                state = $5,
                district = $6,
                profile_pic = $7
            WHERE aadharid = $8
            RETURNING *;
        `;

        const values = [fullname, mobileno, email, village, state, district, profile_pic, aadharid];

        // Execute the query and get the result
        const result = await pool.query(query, values);

        // Check if the user was found and updated
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with the updated user data
        res.json(result.rows[0]);
    } catch (err) {
        // Log and return a server error
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


app.post('/api/adminsignup', async (req, res) => {
    const { admin_id, password, email, mobile_no, city, fullname, profile_pic } = req.body;

    // Basic validation
    if (!admin_id || !password || !email || !mobile_no || !city || !fullname) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check profile picture format if it's provided
        if (profile_pic) {
            const isBase64 = /^data:image\/[a-zA-Z]+;base64,/.test(profile_pic);
            if (!isBase64) {
                return res.status(400).json({ error: 'Invalid profile picture format' });
            }
        }

        // Insert admin data into the database
        const result = await pool.query(
            'INSERT INTO admins (admin_id, password, email, mobile_no, city, fullname, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [admin_id, password, email, mobile_no, city, fullname, profile_pic]
        );
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'adiapa746103gupta@gmail.com', // Your email address
                pass: 'izqr qsyj zfnm rwya' // App-specific password for Gmail
            }
        });

        // Email options
        const mailOptions = {
            from: 'adiapa746103gupta@gmail.com',
            to: email, // Send to the user's email
            subject: 'Welcome to Our Platform',
            text: `Hi ${fullname},\n\nThank you for signing up on our platform!\n\nBest regards,\nYour Company`
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                // Optional: you can log this to your system or retry email logic here.
            } else {
                console.log('Email sent:', info.response);
            }
        });
        // Respond with the inserted admin data
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error inserting admin data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.put('/api/admin/update', upload.single('profile_pic'), async (req, res) => {
    const { fullname, mobile_no, email, city, admin_id } = req.body;

    if (!admin_id) {
        return res.status(400).json({ message: 'admin_id is required' });
    }

    let profile_pic = null;
    if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const newFileName = `${Date.now()}-${req.file.filename}${fileExtension}`;
        const newFilePath = path.join(__dirname, 'uploads', newFileName);

        fs.renameSync(req.file.path, newFilePath);
        profile_pic = `/uploads/${newFileName}`; // Relative path for storage
    }

    try {
        const query = `
            UPDATE admins
            SET fullname = $1, mobile_no = $2, email = $3, city=$4 profile_pic = COALESCE($5, profile_pic)
            WHERE admin_id = $6
            RETURNING *;
        `;

        const values = [fullname, mobile_no, email, city, profile_pic, admin_id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating admin:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/adminlogin', async (req, res) => {
    const { admin_id, password } = req.body;



    try {
        // Query to find the admin by admin_id
        const result = await pool.query('SELECT * FROM admins WHERE admin_id = $1 AND password = $2', [admin_id, password]);

        if (result.rows.length > 0) {
            return res.status(200).json(result.rows[0]);
        }
        else {
            return res.status(401).json({ error: 'Invalid email or password' });

        }


    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/api/roomupload', upload.single('room_pic'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract the form data
        let { mobile_no, city, district, secu_deposit, rent, bed_type, room_type, admin_id } = req.body;
        const room_pic = req.file.buffer;

        console.log('Received file:', req.file);
        console.log('Form data:', req.body);

        // Convert string fields to lowercase
        mobile_no = mobile_no.toLowerCase();
        city = city.toLowerCase();
        district = district.toLowerCase();
        bed_type = bed_type.toLowerCase();
        room_type = room_type.toLowerCase();

        // Insert the data into the database
        const result = await pool.query(
            'INSERT INTO rooms (room_pic, mobile_no, city, district, secu_deposit, rent, bed_type, room_type, admin_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [room_pic, mobile_no, city, district, secu_deposit, rent, bed_type, room_type, admin_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error inserting room data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/rooms', async (req, res) => {
    const { admin_id, room_type } = req.query;

    console.log('Received query:', { admin_id, room_type });

    try {
        const result = await pool.query(
            'SELECT * FROM rooms WHERE admin_id = $1 AND room_type = $2',
            [admin_id, room_type]
        );

        console.log('Query result:', result.rows);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/rooms-delete/:id', async (req, res) => {
    const roomId = parseInt(req.params.id);

    try {
        const roomCheck = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Delete the room
        const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [roomId]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Room deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete room' });
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update room details including image
app.put('/api/rooms-update/:id', upload.single('img'), async (req, res) => {
    const { rent, secu_deposit, city, district, room_type, bed_type } = req.body;
    const roomId = req.params.id;
    let imageUrl = null;

    if (req.file) {
        // If there is a new image, move the file to a permanent location
        const newImagePath = path.join(__dirname, 'uploads', req.file.filename + path.extname(req.file.originalname));
        fs.renameSync(req.file.path, newImagePath);
        imageUrl = `/uploads/${req.file.filename + path.extname(req.file.originalname)}`;
    }

    try {
        const query = `
            UPDATE rooms
            SET rent = $1, secu_deposit = $2, city = $3, district = $4, room_type = $5, bed_type = $6, room_pic = $7
            WHERE id = $8 RETURNING *;
        `;
        const values = [
            rent, secu_deposit, city, district, room_type, bed_type, imageUrl, roomId
        ];

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Error updating room' });
    }
});

// Starting the server


app.get('/availroom', async (req, res) => {
    const { city, district, bed_type, start_date, end_date } = req.query;

    try {
        const availableRoomsQuery = `
            SELECT rooms.id, rooms.room_type, rooms.bed_type, rooms.city, rooms.district, rooms.room_pic, rooms.rent, rooms.mobile_no,rooms.secu_deposit
            FROM rooms
            LEFT JOIN booking ON rooms.id::text = booking.room_id::text  -- Ensure both IDs are compared as text
            AND (
                (booking.start_date <= $4 AND booking.end_date >= $5)  -- Room is booked within the selected range
                OR (booking.start_date BETWEEN $4 AND $5)              -- Room booking starts within the selected range
                OR (booking.end_date BETWEEN $4 AND $5)                -- Room booking ends within the selected range
            )
            WHERE rooms.room_type = 'rooms' 
            AND rooms.city = $1 
            AND rooms.district = $2 
            AND rooms.bed_type = $3 
            AND booking.room_id IS NULL -- Ensure that the room is not booked in the specified date range
        `;

        const result = await pool.query(availableRoomsQuery, [city, district, bed_type, start_date, end_date]);
        const availableRooms = result.rows;

        res.json(availableRooms);

    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).send('Server error');
    }
});

app.get('/availflat', async (req, res) => {
    const { city, district, bed_type, start_date, end_date } = req.query;

    try {
        const availableRoomsQuery = `
            SELECT rooms.id, rooms.room_type, rooms.bed_type, rooms.city, rooms.district, rooms.room_pic, rooms.rent, rooms.mobile_no,rooms.secu_deposit
            FROM rooms
            LEFT JOIN booking ON rooms.id::text = booking.room_id::text  -- Ensure both IDs are compared as text
            AND (
                (booking.start_date <= $4 AND booking.end_date >= $5)  -- Room is booked within the selected range
                OR (booking.start_date BETWEEN $4 AND $5)              -- Room booking starts within the selected range
                OR (booking.end_date BETWEEN $4 AND $5)                -- Room booking ends within the selected range
            )
            WHERE rooms.room_type = 'flat' 
            AND rooms.city = $1 
            AND rooms.district = $2 
            AND rooms.bed_type = $3 
            AND booking.room_id IS NULL -- Ensure that the room is not booked in the specified date range
        `;

        const result = await pool.query(availableRoomsQuery, [city, district, bed_type, start_date, end_date]);
        const availableRooms = result.rows;

        res.json(availableRooms);

    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).send('Server error');
    }
});
app.get('/availpg', async (req, res) => {
    const { city, district, bed_type, start_date, end_date } = req.query;

    try {
        const availableRoomsQuery = `
            SELECT rooms.id, rooms.room_type, rooms.bed_type, rooms.city, rooms.district, rooms.room_pic, rooms.rent, rooms.mobile_no,rooms.secu_deposit
            FROM rooms
            LEFT JOIN booking ON rooms.id::text = booking.room_id::text  -- Ensure both IDs are compared as text
            AND (
                (booking.start_date <= $4 AND booking.end_date >= $5)  -- Room is booked within the selected range
                OR (booking.start_date BETWEEN $4 AND $5)              -- Room booking starts within the selected range
                OR (booking.end_date BETWEEN $4 AND $5)                -- Room booking ends within the selected range
            )
            WHERE rooms.room_type = 'pg' 
            AND rooms.city = $1 
            AND rooms.district = $2 
            AND rooms.bed_type = $3 
            AND booking.room_id IS NULL -- Ensure that the room is not booked in the specified date range
        `;

        const result = await pool.query(availableRoomsQuery, [city, district, bed_type, start_date, end_date]);
        const availableRooms = result.rows;

        res.json(availableRooms);

    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).send('Server error');
    }
});
app.get('/availboyhostel', async (req, res) => {
    const { city, district, bed_type, start_date, end_date } = req.query;

    try {
        const availableRoomsQuery = `
            SELECT rooms.id, rooms.room_type, rooms.bed_type, rooms.city, rooms.district, rooms.room_pic, rooms.rent, rooms.mobile_no,rooms.secu_deposit
            FROM rooms
            LEFT JOIN booking ON rooms.id::text = booking.room_id::text  -- Ensure both IDs are compared as text
            AND (
                (booking.start_date <= $4 AND booking.end_date >= $5)  -- Room is booked within the selected range
                OR (booking.start_date BETWEEN $4 AND $5)              -- Room booking starts within the selected range
                OR (booking.end_date BETWEEN $4 AND $5)                -- Room booking ends within the selected range
            )
            WHERE rooms.room_type = 'boy hostel' 
            AND rooms.city = $1 
            AND rooms.district = $2 
            AND rooms.bed_type = $3 
            AND booking.room_id IS NULL -- Ensure that the room is not booked in the specified date range
        `;

        const result = await pool.query(availableRoomsQuery, [city, district, bed_type, start_date, end_date]);
        const availableRooms = result.rows;

        res.json(availableRooms);

    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).send('Server error');
    }
});
app.get('/availgirlhostel', async (req, res) => {
    const { city, district, bed_type, start_date, end_date } = req.query;

    try {
        const availableRoomsQuery = `
            SELECT rooms.id, rooms.room_type, rooms.bed_type, rooms.city, rooms.district, rooms.room_pic, rooms.rent, rooms.mobile_no,rooms.secu_deposit
            FROM rooms
            LEFT JOIN booking ON rooms.id::text = booking.room_id::text  -- Ensure both IDs are compared as text
            AND (
                (booking.start_date <= $4 AND booking.end_date >= $5)  -- Room is booked within the selected range
                OR (booking.start_date BETWEEN $4 AND $5)              -- Room booking starts within the selected range
                OR (booking.end_date BETWEEN $4 AND $5)                -- Room booking ends within the selected range
            )
            WHERE rooms.room_type = 'girl hostel' 
            AND rooms.city = $1 
            AND rooms.district = $2 
            AND rooms.bed_type = $3 
            AND booking.room_id IS NULL -- Ensure that the room is not booked in the specified date range
        `;

        const result = await pool.query(availableRoomsQuery, [city, district, bed_type, start_date, end_date]);
        const availableRooms = result.rows;

        res.json(availableRooms);

    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).send('Server error');
    }
});


app.post('/payment', async (req, res) => {
    const { booking_id, total_pay } = req.body;
  
    if (!booking_id || !total_pay) {
      return res.status(400).json({ error: 'Booking ID and Total Payment are required' });
    }
  
    try {
      const query = 'INSERT INTO payment (booking_id, total_pay) VALUES ($1, $2) RETURNING *';
      const values = [booking_id, total_pay];
  
      const result = await pool.query(query, values);
      res.status(201).json({
        message: 'Payment recorded successfully',
        payment: result.rows[0],
      });
    } catch (err) {
      console.error('Error inserting data into payment table:', err);
      res.status(500).json({ error: 'Failed to insert payment data' });
    }
  });
  

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
