# StudyFlow Backend
# This Flask server receives study topics from the React frontend,
# generates a study plan based on the exam deadline,
# stores the plan in an SQLite database,
# and returns the plan to the frontend.

# Flask is used to create the backend server and APIs
from flask import Flask, request, jsonify

# CORS allows the React frontend to communicate with this backend
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
# datetime helps us calculate study dates and deadlines
from datetime import datetime, timedelta

# sqlite3 is used to store study plans in a database file
import sqlite3


# This function creates the SQLite database and the 'plans' table
# if they do not already exist.
def init_db():
    conn = sqlite3.connect("studyflow.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT,
        date TEXT,
        full_date TEXT,
        topic TEXT
    )
    """)

    conn.commit()
    conn.close()


# Create the Flask application and enable CORS
app = Flask(__name__)
CORS(app)

# Initialize database
init_db()


# API endpoint to generate a study plan
# It receives subject, topics, and deadline from the frontend
# Then it distributes topics across the available days
# and saves the plan in the database.

# API endpoint to generate a study plan based on selected study days
# This function receives subject, topics, deadline, and selected study days
# from the React frontend and schedules topics only on the allowed days.

@app.route("/generate-plan", methods=["POST"])
def generate_plan():

    # Get JSON data sent from the React frontend
    data = request.json

    # Extract values from the received data safely
    subject = data.get("subject") or ""        # Subject name (e.g., CN, DMS, Linux)
    topics = data.get("topics") or []          # List of topics entered by the user
    deadline = data.get("deadline") or ""      # Exam deadline selected by the user
    selected_days = data.get("days") or []     # List of study days selected by the user

    # Clean topics list (remove empty strings)
    topics = [t.strip() for t in topics if isinstance(t, str) and t.strip() != ""]

    # Basic validation to ensure required data is present
    if not subject.strip() or len(topics) == 0 or not deadline or not selected_days:
        return jsonify({"error": "Missing required fields"}), 400

    # Get today's date
    today = datetime.today()

    # Convert the deadline string into a datetime object
    try:
        exam_date = datetime.strptime(deadline, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    # Check if the deadline is valid (must be in the future)
    if exam_date.date() < today.date():
        return jsonify({"error": "Deadline must be in future"}), 400

    # List that will store the generated study plan
    plan = []

    # Index used to track which topic we are currently scheduling
    topic_index = 0

    # Start scheduling from today's date
    current_day = today

    # Counter to track how many topics were scheduled before adding revision
    revision_counter = 0

    # Open database connection once for better performance
    conn = sqlite3.connect("studyflow.db")
    cursor = conn.cursor()

    # Clear previous plans (optional but keeps database clean)
    #cursor.execute("DELETE FROM plans")

    # Continue scheduling until:
    # 1) All topics are assigned OR
    # 2) The exam deadline is reached
    while topic_index < len(topics) and current_day <= exam_date:

        # Get the name of the current day (Monday, Tuesday, etc.)
        day_name = current_day.strftime("%A")

        # Check if the current day is one of the selected study days
        if day_name in selected_days:

            # Select the current topic to schedule
            topic = topics[topic_index]

            # Extra safety (skip empty topics if any slipped through)
            if topic.strip() == "":
                topic_index += 1
                continue

            # Add the scheduled topic to the study plan list
            plan.append({
                "subject": subject,
                "date": current_day.strftime("%d %b"),   # Example: 18 Mar
                "full_date": current_day.strftime("%Y-%m-%d"),
                "topic": topic
            })

            # -------- SAVE THE PLAN TO DATABASE --------
            cursor.execute(
                "INSERT INTO plans (subject, date, full_date, topic) VALUES (?, ?, ?, ?)",
                (subject, current_day.strftime("%d %b"), current_day.strftime("%Y-%m-%d"), topic)
            )

            # Move to the next topic
            topic_index += 1

            # Increase revision counter
            revision_counter += 1

            # After every 3 topics, schedule a revision
            if revision_counter == 3:

                revision_text = "Revision"

                plan.append({
                    "subject": subject,
                    "date": current_day.strftime("%d %b"),
                    "full_date": current_day.strftime("%Y-%m-%d"),
                    "topic": revision_text
                })

                cursor.execute(
                    "INSERT INTO plans (subject, date, full_date, topic) VALUES (?, ?, ?, ?)",
                    (subject, current_day.strftime("%d %b"), current_day.strftime("%Y-%m-%d"), revision_text)
                )

                # Reset revision counter after scheduling revision
                revision_counter = 0

        # Move to the next calendar day
        current_day += timedelta(days=1)

    # Save all database changes
    conn.commit()
    conn.close()

    # Return the generated study plan to the React frontend
    return jsonify(plan)


# API endpoint to retrieve all saved study plans from the database
@app.route("/plans", methods=["GET"])
def get_plans():

    conn = sqlite3.connect("studyflow.db")
    # This allows us to access columns by name instead of index
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()

    cursor.execute("SELECT subject, date, full_date, topic FROM plans")

    rows = cursor.fetchall()

    conn.close()

    plans = []

    for row in rows:
        plans.append({
            "subject": row["subject"],
            "date": row["date"],
            "full_date": row["full_date"],
            "topic": row["topic"]
        })

    return jsonify(plans)


# Start the Flask development server
# debug=True automatically reloads the server when code changes are made, which is useful during development.
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)