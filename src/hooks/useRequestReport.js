import { useCallback } from 'react';
import { getRequestReport } from '../lib/reports';
import useReportResource from './useReportResource';

export default function useRequestReport(id, revision = '') {
  const fetchReport = useCallback(() => getRequestReport(id), [id, revision]);
  return useReportResource(fetchReport, `request-report:${id}`);
}
