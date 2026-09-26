const fs = require('fs');
const zlib = require('zlib');

const bptPath = 'exports/ChiPhiCongTac_4Cap.bpt';
const raw = zlib.inflateSync(fs.readFileSync(bptPath)).toString('utf-8');

const targetEmptySeq = 'i:1;a:6:{s:4:"Type";s:16:"SequenceActivity";s:4:"Name";s:24:"A58520_68983_49019_16259";s:9:"Activated";s:1:"Y";s:4:"Node";N;s:10:"Properties";a:1:{s:5:"Title";s:28:"Trong chuỗi hoạt động";}s:8:"Children";a:0:{}}';

const replacementSeq = 'i:1;a:6:{s:4:"Type";s:16:"SequenceActivity";s:4:"Name";s:24:"A58520_68983_49019_16259";s:9:"Activated";s:1:"Y";s:4:"Node";N;s:10:"Properties";a:1:{s:5:"Title";s:28:"Trong chuỗi hoạt động";}s:8:"Children";a:1:{i:0;a:6:{s:4:"Type";s:16:"IMNotifyActivity";s:4:"Name";s:24:"A33119_55218_88412_99120";s:9:"Activated";s:1:"Y";s:4:"Node";N;s:10:"Properties";a:7:{s:11:"MessageSite";s:177:"Rất tiếc! Đề xuất chi phí công tác của bạn đã bị từ chối. Vui lòng kiểm tra lại lý do phản hồi từ người phê duyệt.";s:10:"MessageOut";s:0:"";s:11:"MessageType";s:1:"2";s:15:"MessageUserFrom";a:1:{i:0;s:6:"user_1";}s:13:"MessageUserTo";a:1:{i:0;s:6:"author";}s:5:"Title";s:51:"Thông báo: Đề xuất chi phí bị từ chối";s:13:"EditorComment";s:0:"";}s:8:"Children";a:0:{}}}}';

if (raw.includes(targetEmptySeq)) {
  const patched = raw.replace(targetEmptySeq, replacementSeq);
  const compressed = zlib.deflateSync(Buffer.from(patched, 'utf-8'));
  fs.writeFileSync(bptPath, compressed);
  console.log('Successfully patched ChiPhiCongTac_4Cap.bpt with Cấp 1 rejection notification!');
} else {
  console.log('Target string not found in ChiPhiCongTac_4Cap.bpt');
}
