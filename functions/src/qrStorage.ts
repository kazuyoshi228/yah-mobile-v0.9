import * as logger from "firebase-functions/logger";
/**
 * functions/src/qrStorage.ts — QR コード生成 → Firebase Storage 保存
 *
 * eSIM の LPA プロファイル文字列から QR コード PNG を生成し、
 * Firebase Storage の `qrcodes/{orderId}.png` に保存する。
 * Admin SDK 経由のため Security Rules をバイパスして書き込み可能。
 *
 * 呼び出し元: onOrderPaid.ts の fulfillEsim()
 */

import * as QRCode from "qrcode";
import { getStorage } from "firebase-admin/storage";

/**
 * LPA プロファイルから QR コード PNG を生成し Storage に保存する。
 * @returns 公開ダウンロード URL（失敗時は null）
 */
export async function generateAndStoreQrCode(
  orderId: string,
  lpaProfile: string
): Promise<string | null> {
  try {
    // PNG バッファを生成（エラー訂正レベル M、512×512px）
    const pngBuffer = await QRCode.toBuffer(lpaProfile, {
      type: "png",
      errorCorrectionLevel: "M",
      width: 512,
      margin: 2,
    });

    const bucket = getStorage().bucket();
    const filePath = `qrcodes/${orderId}.png`;
    const file = bucket.file(filePath);

    // Storage に保存（公開読み取り可能に設定）
    await file.save(pngBuffer, {
      metadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      },
    });

    // 署名なし公開URLは廃止（セキュアにするためmakePublicを削除）
    // await file.makePublic();
    // 代わりにStorageの内部パスなどを返すか、ダミーのURLを返します
    const publicUrl = `gs://${bucket.name}/${filePath}`;

    logger.info(`[qrStorage] QR code saved privately: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    logger.error(`[qrStorage] Failed to generate/store QR code for order ${orderId}:`, err);
    return null;
  }
}
