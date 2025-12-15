import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';

export class ScraperUtil {
  private defaultHeaders: { [key: string]: string };

  constructor() {
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  async fetchPage(url: string, config?: AxiosRequestConfig): Promise<cheerio.CheerioAPI> {
    try {
      const response = await axios.get(url, {
        headers: { ...this.defaultHeaders, ...config?.headers },
        timeout: 10000,
        maxRedirects: 5,
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024,
        ...config
      });

      return cheerio.load(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  extractNumber(text: string): number | null {
    const cleaned = text.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  extractText(element: cheerio.Cheerio<any>): string {
    return element.text().trim();
  }
}
