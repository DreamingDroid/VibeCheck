import { DayPicker } from 'react-day-picker';
type Components = Parameters<typeof DayPicker>[0]['components'];
type Keys = keyof Components;
console.log("Keys:", null as any as Keys);
