import { createShortWazeLink } from "../app/utilityFunctions/createShortWazeLink.ts"; // שנה את הנתיב לפי המיקום האמיתי שלך

(async () => {
  const shortLink = await createShortWazeLink("בנימין מטודלה 61 תל אביב");
  console.log("קישור Waze מקוצר:", shortLink);
})();
