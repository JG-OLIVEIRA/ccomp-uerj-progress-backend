import express from 'express';
import {
    createStudent,
    getStudentById,
    updateStudent,
    updateCompletedDisciplines,
    updateCurrentDisciplines,
    deleteStudent,
    getAllDisciplines,
    getDisciplineById
} from '../db/mongo.js';

const router = express.Router();

/**
 * @swagger
 * /students/{studentId}:
 *   get:
 *     summary: Returns a student by their ID.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         description: The ID of the student to be returned.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error retrieving the student.
 */
router.get('/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await getStudentById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send(student);
    } catch (error) {
        res.status(500).send({ error: 'Error retrieving the student' });
    }
});

/**
 * @swagger
 * /students/{studentId}/disciplines:
 *   get:
 *     summary: Returns all disciplines with their status for a specific student.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of all disciplines with their status for the student.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DisciplineWithStatus'
 *       404:
 *         description: Student not found.
 */
router.get('/:studentId/disciplines', async (req, res) => {
    const { studentId } = req.params;
    const student = await getStudentById(studentId);
    if (!student) {
        return res.status(404).send({ error: 'Student not found' });
    }

    const disciplines = await getAllDisciplines();
    const disciplinesWithStatus = disciplines.map(discipline => {
        let status = 'not_taken';
        if (student.completedDisciplines.includes(discipline.disciplineId)) {
            status = 'completed';
        } else if (student.currentDisciplines.includes(discipline.disciplineId)) {
            status = 'in_progress';
        }
        // Return a new object with the status property
        return { ...JSON.parse(JSON.stringify(discipline)), status };
    });

    res.send(disciplinesWithStatus);
});

/**
 * @swagger
 * /students/{studentId}/disciplines/{disciplineId}:
 *   get:
 *     summary: Returns a single discipline with its status for a specific student.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: disciplineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The discipline with its status for the student.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisciplineWithStatus'
 *       404:
 *         description: Student or Discipline not found.
 */
router.get('/:studentId/disciplines/:disciplineId', async (req, res) => {
    const { studentId, disciplineId } = req.params;

    const student = await getStudentById(studentId);
    if (!student) {
        return res.status(404).send({ error: 'Student not found' });
    }

    const discipline = await getDisciplineById(disciplineId);
    if (!discipline) {
        return res.status(404).send({ error: 'Discipline not found' });
    }

    let status = 'not_taken';
    if (student.completedDisciplines.includes(discipline.disciplineId)) {
        status = 'completed';
    } else if (student.currentDisciplines.includes(discipline.disciplineId)) {
        status = 'in_progress';
    }

    res.send({ ...JSON.parse(JSON.stringify(discipline)), status });
});


/**
 * @swagger
 * /students:
 *   post:
 *     summary: Creates a new student.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - name
 *               - lastName
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: '20201010101'
 *               name:
 *                 type: string
 *                 example: 'John'
 *               lastName:
 *                 type: string
 *                 example: 'Doe'
 *               completedDisciplines:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['IMH001', 'IMH002']
 *     responses:
 *       201:
 *         description: Student created successfully.
 *       400:
 *         description: The student ID, name, and last name are required.
 *       409:
 *         description: A student with the same ID already exists.
 *       500:
 *         description: Error creating the student.
 */
router.post('/', async (req, res) => {
    const { studentId, name, lastName, completedDisciplines } = req.body;

    if (!studentId || !name || !lastName) {
        return res.status(400).send({ error: 'studentId, name and lastName are required' });
    }

    try {
        const existingStudent = await getStudentById(studentId);
        if (existingStudent) {
            return res.status(409).send({ error: `Student with ID ${studentId} already exists` });
        }

        await createStudent({ studentId, name, lastName, completedDisciplines: completedDisciplines || [] });
        res.status(201).send({ message: `Student ${studentId} created successfully` });
    } catch (error) {
        res.status(500).send({ error: 'Error creating student' });
    }
});

/**
 * @swagger
 * /students/{studentId}:
 *   patch:
 *     summary: Partially updates a student's information (name and/or lastName).
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'John'
 *               lastName:
 *                 type: string
 *                 example: 'Doe'
 *     responses:
 *       200:
 *         description: Student updated successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error updating the student.
 */
router.patch('/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { name, lastName } = req.body;

    try {
        const result = await updateStudent({ studentId, name, lastName });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Student ${studentId} updated successfully` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating student', details: error.message });
    }
});


/**
 * @swagger
 * /students/{studentId}/completed-disciplines/{disciplineId}:
 *   put:
 *     summary: Adds a single completed discipline to a student's record.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: disciplineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discipline added successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error updating the student.
 */
router.put('/:studentId/completed-disciplines/:disciplineId', async (req, res) => {
    const { studentId, disciplineId } = req.params;
    try {
        const result = await updateCompletedDisciplines({ studentId, add: [disciplineId] });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Discipline ${disciplineId} added to student ${studentId}` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating the student', details: error.message });
    }
});

/**
 * @swagger
 * /students/{studentId}/completed-disciplines/{disciplineId}:
 *   delete:
 *     summary: Removes a single completed discipline from a student's record.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: disciplineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discipline removed successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error updating the student.
 */
router.delete('/:studentId/completed-disciplines/:disciplineId', async (req, res) => {
    const { studentId, disciplineId } = req.params;
    try {
        const result = await updateCompletedDisciplines({ studentId, remove: [disciplineId] });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Discipline ${disciplineId} removed from student ${studentId}` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating the student', details: error.message });
    }
});

/**
 * @swagger
 * /students/{studentId}/current-disciplines/{disciplineId}:
 *   put:
 *     summary: Adds a single currently-taken discipline to a student's record.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: disciplineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discipline added successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error updating the student.
 */
router.put('/:studentId/current-disciplines/:disciplineId', async (req, res) => {
    const { studentId, disciplineId } = req.params;
    try {
        const result = await updateCurrentDisciplines({ studentId, add: [disciplineId] });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Discipline ${disciplineId} added to student ${studentId}` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating the student', details: error.message });
    }
});

/**
 * @swagger
 * /students/{studentId}/current-disciplines/{disciplineId}:
 *   delete:
 *     summary: Removes a single currently-taken discipline from a student's record.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: disciplineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discipline removed successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error updating the student.
 */
router.delete('/:studentId/current-disciplines/:disciplineId', async (req, res) => {
    const { studentId, disciplineId } = req.params;
    try {
        const result = await updateCurrentDisciplines({ studentId, remove: [disciplineId] });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Discipline ${disciplineId} removed from student ${studentId}` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating the student', details: error.message });
    }
});


/**
 * @swagger
 * /students/{studentId}:
 *   delete:
 *     summary: Deletes a student by their ID.
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         description: The ID of the student to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student deleted successfully.
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Error deleting the student.
 */
router.delete('/:studentId', async (req, res) => {
    const { studentId } = req.params;

    try {
        const result = await deleteStudent(studentId);
        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Student not found' });
        }
        res.status(200).send({ message: `Student ${studentId} deleted successfully` });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting the student' });
    }
});

export default router;
