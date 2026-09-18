CREATE TABLE departments
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    description VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    ,student_username VARCHAR(100) UNIQUE

    ,student_password VARCHAR(255)

    ,account_status VARCHAR(20) NOT NULL DEFAULT 'Active'

    ,department_id INT

    ,semester_id INT
);

CREATE TABLE students
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    gender ENUM('Male','Female','Other'),

    date_of_birth DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_logs
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(100) NOT NULL,

    action VARCHAR(255) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faculty
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(100) NOT NULL UNIQUE,

    phone VARCHAR(20),

    department_id INT NOT NULL,

    designation VARCHAR(100) NOT NULL,

    username VARCHAR(100) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_faculty_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
);

    CREATE TABLE courses
    (
        id INT AUTO_INCREMENT PRIMARY KEY,

        department_id INT NOT NULL,

        name VARCHAR(150) NOT NULL,

        code VARCHAR(30) NOT NULL UNIQUE,

        duration_years INT NOT NULL,

        status VARCHAR(20) NOT NULL DEFAULT 'Active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_course_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE semesters
    (
        id INT AUTO_INCREMENT PRIMARY KEY,

        course_id INT NOT NULL,

        semester_number INT NOT NULL,

        name VARCHAR(100) NOT NULL,

        status VARCHAR(20) NOT NULL DEFAULT 'Active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_course_semester UNIQUE (course_id, semester_number),

        CONSTRAINT fk_semester_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE subjects
    (
        id INT AUTO_INCREMENT PRIMARY KEY,

        semester_id INT NOT NULL,

        name VARCHAR(150) NOT NULL,

        code VARCHAR(30) NOT NULL UNIQUE,

        credits INT NOT NULL DEFAULT 3,

        status VARCHAR(20) NOT NULL DEFAULT 'Active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_subject_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
    );

    CREATE TABLE sections
    (
        id INT AUTO_INCREMENT PRIMARY KEY,

        semester_id INT NOT NULL,

        name VARCHAR(50) NOT NULL,

        capacity INT NOT NULL DEFAULT 60,

        status VARCHAR(20) NOT NULL DEFAULT 'Active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_semester_section UNIQUE (semester_id, name),

        CONSTRAINT fk_section_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
    );

CREATE TABLE attendance
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    subject_id INT NOT NULL,

    attendance_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_subject_date UNIQUE (student_id, subject_id, attendance_date),

    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id),

    CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE marks
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    subject_id INT NOT NULL,

    internal_marks DECIMAL(5,2) NOT NULL,

    external_marks DECIMAL(5,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_subject_marks UNIQUE (student_id, subject_id),

    CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id),

    CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE timetable
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    semester_id INT NOT NULL,

    subject_id INT NOT NULL,

    day_of_week VARCHAR(20) NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    room VARCHAR(50) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_timetable_semester FOREIGN KEY (semester_id) REFERENCES semesters(id),

    CONSTRAINT fk_timetable_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE notices
(
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(200) NOT NULL,

    content TEXT NOT NULL,

    notice_type VARCHAR(50) NOT NULL,

    created_by VARCHAR(100) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Published',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);