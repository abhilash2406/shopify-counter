import { Impression } from "../../models/Impression.js";
import { getTimer } from "../timers/timer.service.js";


// api to get timer datas, it will throw error it that store belong to corresponding one's
export const getTimerAnalytics = async (shop, timerId) => {
  await getTimer(shop, timerId); 
  return Impression.totalsForTimer(timerId);
};
