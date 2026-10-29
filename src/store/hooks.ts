import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from './index';
import type { RootState } from './rootReducer';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
