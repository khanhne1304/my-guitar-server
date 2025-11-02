import { getStatisticsService } from '../services/statistics.service.js';

export async function getStatistics(req, res, next) {
  try {
    const statistics = await getStatisticsService();
    res.json(statistics);
  } catch (error) {
    next(error);
  }
}

