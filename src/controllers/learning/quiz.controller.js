import * as quizService from '../../services/learning/quiz.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function createQuiz(req, res, next) {
  try {
    const quiz = await quizService.createQuiz(req.user, req.body);
    res.status(201).json({ quiz });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function getQuiz(req, res, next) {
  try {
    const quiz = await quizService.getQuizForTake(req.params.id, req.user);
    res.json({ quiz });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function updateQuiz(req, res, next) {
  try {
    const quiz = await quizService.updateQuiz(req.user, req.params.id, req.body);
    res.json({ quiz });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    const data = await quizService.deleteQuiz(req.user, req.params.id);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const result = await quizService.submitQuiz(req.user, req.params.id, req.body.answers);
    res.json(result);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
