import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const sessions_id = (1000000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-sessions-${sessions_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base"),
      $(".a-price.a-text-price")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavailable";

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));

    const discountRate = $(".savingsPercentage").text().replace(/[-%]/g, "");

    const reviewsCount = $(".a-row.a-spacing-medium.averageStarRatingNumerical")
      .text()
      .trim()
      .replace(/[^\d.]/g, "");

    const averageReviewStars = $(
      ".a-fixed-left-grid-col.aok-align-center.a-col-right"
    )
      .text()
      .trim()
      .replace(/[^\d.]/g, "");

    const description = extractDescription($);

    const data = {
      url,
      currency: currency || "$",
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice) || 0,
      originalPrice: Number(originalPrice) || Number(currentPrice) || 0,
      priceHistory: [],
      discountRate: Number(discountRate),
      category: "category",
      reviewsCount: Number(reviewsCount),
      stars: Number(averageReviewStars),
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice) || 0,
      highestPrice: Number(originalPrice) || Number(currentPrice) || 0,
      averagePrice: Number(currentPrice) || Number(originalPrice) || 0,
    };

    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
