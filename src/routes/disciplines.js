import express from 'express';
import { getAllDisciplines, getDisciplineById, updateWhatsappGroup } from '../db/mongo.js';
import { scrapeDisciplines } from '../scraping/scraper.js';
import 'dotenv/config';

const router = express.Router();

/**
 * @swagger
 * /disciplines:
 *   get:
 *     summary: Returns all disciplines.
 *     responses:
 *       200:
 *         description: A list of all disciplines.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discipline'
 */
router.get('/', async (req, res) => {
    const disciplines = await getAllDisciplines();
    res.send(disciplines);
});

/**
 * @swagger
 * /disciplines/{id}:
 *   get:
 *     summary: Returns a discipline by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the discipline.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The discipline corresponding to the ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discipline'
 *       404:
 *         description: Discipline not found.
 */
router.get('/:id', async (req, res) => {
    const discipline = await getDisciplineById(req.params.id);
    if (discipline) {
        res.send(discipline);
    } else {
        res.status(404).send({ error: 'Discipline not found' });
    }
});

/**
 * @swagger
 * /disciplines/{id}/classes/{classNumber}:
 *   get:
 *     summary: Returns a specific class from a discipline.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the discipline.
 *         schema:
 *           type: string
 *       - in: path
 *         name: classNumber
 *         required: true
 *         description: The number of the class.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The specific class from the discipline.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       404:
 *         description: Discipline or class not found.
 */
router.get('/:id/classes/:classNumber', async (req, res) => {
    const { id, classNumber } = req.params;
    const discipline = await getDisciplineById(id);

    if (!discipline) {
        return res.status(404).send({ error: 'Discipline not found' });
    }

    const classInfo = discipline.classes.find(c => String(c.number) === classNumber);

    if (!classInfo) {
        return res.status(404).send({ error: 'Class not found' });
    }

    res.send(classInfo);
});

/**
 * @swagger
 * /disciplines/actions/scrape:
 *   post:
 *     summary: Forces an update of the disciplines database by scraping data from Aluno Online.
 *     responses:
 *       202:
 *         description: Disciplines update process started.
 */
router.post('/actions/scrape', async (req, res) => {
    // Fire and forget: start the process but don't wait for it to finish
    scrapeDisciplines(process.env.UERJ_MATRICULA, process.env.UERJ_SENHA);
    res.status(202).send({ message: 'Discipline scraping process started.' });
});

/**
 * @swagger
 * /disciplines/{id}/classes/{classNumber}:
 *   patch:
 *     summary: Updates the WhatsApp group link for a specific class.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the discipline.
 *         schema:
 *           type: string
 *       - in: path
 *         name: classNumber
 *         required: true
 *         description: The number of the class.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whatsappGroup:
 *                 type: string
 *                 description: The WhatsApp group link.
 *     responses:
 *       200:
 *         description: WhatsApp group updated successfully.
 *       404:
 *         description: Discipline or class not found.
 *       500:
 *         description: Error updating the WhatsApp group.
 */
router.patch('/:id/classes/:classNumber', async (req, res) => {
    const { id, classNumber } = req.params;
    const { whatsappGroup } = req.body;

    try {
        const result = await updateWhatsappGroup({ disciplineId: id, classNumber, whatsappGroup });
        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Discipline or class not found' });
        }
        res.status(200).send({ message: `WhatsApp group for class ${classNumber} updated successfully` });
    } catch (error) {
        res.status(500).send({ error: 'Error updating the WhatsApp group' });
    }
});

export default router;
