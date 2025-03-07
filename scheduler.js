import 'dotenv/config';
import mysql from 'mysql2/promise';

(async() => {
  console.log("Running scheduler task...");

  //Create a database connection
      const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  
    //Get the active question
    async function getActiveQuestion(connection) {
      try {
        const [current] = await connection.query('SELECT question FROM qotw_questions WHERE is_active = TRUE LIMIT 1');
        if (current.length > 0) {
          return current[0].question;
        } else {
          console.log('No active question found.');
          return null; 
      } 
      } catch (error) 
      {
        console.error('Error retrieving active question: ', error);
        throw error;
      }
    }
  
  //Connect to database, handle error, close connection when done
  try {
      let currentQuestion = await getActiveQuestion(connection);
      //Check if today is Monday
      const today = new Date();
      if (today.getDay() !== 1 && currentQuestion !== null) {
        console.log('Today is not Monday. No rotation performed. Current question: ', currentQuestion);
      }
      else {
      // Calculate the current week
      const [[{ current_week }]] = await connection.query('SELECT WEEK(CURDATE(), 1) AS current_week');
  
      // Deactivate the current question if not the current week
      await connection.query(`UPDATE qotw_questions SET is_active = FALSE WHERE is_active = TRUE AND last_asked_week < ?
      ORDER BY id ASC
      LIMIT 1
      `, [current_week]);
  
      // Reset last_asked_week if needed
      const [[{ remaining }]] = await connection.query(`
        SELECT COUNT(*) AS remaining
        FROM qotw_questions
        WHERE last_asked_week IS NULL OR last_asked_week < ?
      `, [current_week]);
  
      if (remaining === 0) {
        await connection.query('UPDATE qotw_questions SET last_asked_week = NULL');
      }
  
      // Activate the next question
      await connection.query(`
        UPDATE qotw_questions
        SET is_active = TRUE, last_asked_week = ?
        WHERE last_asked_week IS NULL AND is_active = FALSE
        ORDER BY id ASC
        LIMIT 1
      `, [current_week, current_week]);
  
      //Return the current question
      currentQuestion = await getActiveQuestion(connection);
      console.log('Today is Monday. Rotation performed. Current question: ', currentQuestion);
    }
    } catch (error) {
      console.error('Error during question rotation:', error);
      throw error;
    } finally {
      console.log("Scheduler task completed. Exiting...");
      process.exit(0);
    }
  })();