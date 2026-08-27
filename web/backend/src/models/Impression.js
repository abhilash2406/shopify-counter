import mongoose from "mongoose";

const { Schema } = mongoose;

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

const impressionSchema = new Schema(
  {
    timerId: { type: Schema.Types.ObjectId, ref: "Timer", required: true },
    shop: { type: String, required: true },
    day: { type: Date, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

impressionSchema.index({ timerId: 1, day: 1 }, { unique: true });

impressionSchema.statics.recordImpression = function recordImpression(
  timerId,
  shop,
  when = new Date()
) {
  return this.updateOne(
    { timerId, shop, day: startOfUtcDay(when) },
    { $inc: { count: 1 } },
    { upsert: true }
  );
};

impressionSchema.statics.totalsForTimer = async function totalsForTimer(
  timerId
) {
  const [result] = await this.aggregate([
    { $match: { timerId: new mongoose.Types.ObjectId(timerId) } },
    {
      $facet: {
        totals: [{ $group: { _id: null, total: { $sum: "$count" } } }],
        byDay: [
          { $sort: { day: 1 } },
          { $project: { _id: 0, day: 1, count: 1 } },
        ],
      },
    },
  ]);

  return {
    total: result?.totals[0]?.total ?? 0,
    byDay: result?.byDay ?? [],
  };
};

export const Impression = mongoose.model("Impression", impressionSchema);
