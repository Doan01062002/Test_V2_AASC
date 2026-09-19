import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SyncJobStatus, SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from '../sync/sync-engine.service';

async function bootstrap() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
===========================================================
  Bitrix24 & Google Sheets Sync CLI Runner
===========================================================

Sử dụng:
  npm run sync:cli [options]

Tùy chọn:
  --full, -f        Đồng bộ toàn bộ (bỏ qua cache hash & idempotency check)
  --dry-run, -d     Chạy thử nghiệm (không ghi vào Bitrix24 và Google Sheets)
  --sheet, -s       Tên worksheet trong Google Sheet (mặc định: Sheet1)
  --id              Google Spreadsheet ID tùy chỉnh
  --help, -h        Hiển thị thông tin trợ giúp

Ví dụ:
  npm run sync:cli
  npm run sync:cli -- --full
  npm run sync:cli -- --dry-run
===========================================================
    `);
    process.exit(0);
  }

  const forceFullSync = args.includes('--full') || args.includes('-f');
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  let sheetName: string | undefined;
  const sheetIdx = args.findIndex((a) => a === '--sheet' || a === '-s');
  if (sheetIdx !== -1 && args[sheetIdx + 1]) {
    sheetName = args[sheetIdx + 1];
  }

  let spreadsheetId: string | undefined;
  const idIdx = args.indexOf('--id');
  if (idIdx !== -1 && args[idIdx + 1]) {
    spreadsheetId = args[idIdx + 1];
  }

  console.log('\x1b[36m%s\x1b[0m', `
===========================================================
  KHỞI ĐỘNG ĐỒNG BỘ GOOGLE SHEETS ↔ BITRIX24 CRM
===========================================================
  • Chế độ: ${forceFullSync ? '\x1b[33mFULL SYNC (Bỏ qua hash)\x1b[0m' : 'INCREMENTAL SYNC'}
  • Dry Run: ${dryRun ? '\x1b[33mBẬT (Không ghi dữ liệu)\x1b[0m' : 'TẮT'}
  • Sheet: ${sheetName || 'Mặc định'}
===========================================================
  `);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const syncEngine = app.get(SyncEngineService);
    const summary = await syncEngine.executeSync({
      forceFullSync,
      dryRun,
      sheetName,
      spreadsheetId,
      triggerType: SyncTriggerType.CLI,
    });

    const isSuccess = summary.status === SyncJobStatus.SUCCESS;
    const statusColor = isSuccess ? '\x1b[32m' : summary.status === SyncJobStatus.PARTIAL_SUCCESS ? '\x1b[33m' : '\x1b[31m';

    console.log(`
\x1b[1mKẾT QUẢ ĐỒNG BỘ:\x1b[0m
-----------------------------------------------------------
  Trạng thái:     ${statusColor}${summary.status}\x1b[0m
  Mã tác vụ:      ${summary.jobId}
  Tổng số dòng:   ${summary.totalRows}
  Tạo mới (CRM):  \x1b[32m${summary.createdCount}\x1b[0m
  Cập nhật:       \x1b[34m${summary.updatedCount}\x1b[0m
  Bỏ qua (Hash):  ${summary.skippedCount}
  Gặp lỗi:        ${summary.errorCount > 0 ? '\x1b[31m' + summary.errorCount + '\x1b[0m' : '0'}
  Thời lượng:     ${summary.durationMs} ms
-----------------------------------------------------------
    `);

    if (summary.errors && summary.errors.length > 0) {
      console.log('\x1b[31m%s\x1b[0m', 'DANH SÁCH LỖI CHI TIẾT:');
      summary.errors.forEach((err, idx) => {
        console.log(`  [${idx + 1}] Dòng ${err.rowNumber} (${err.leadTitle || 'N/A'}): ${err.error}`);
      });
    }

    await app.close();
    process.exit(isSuccess || summary.status === SyncJobStatus.PARTIAL_SUCCESS ? 0 : 1);
  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', `LỖI ĐỒNG BỘ NGHIÊM TRỌNG: ${error.message}`);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
