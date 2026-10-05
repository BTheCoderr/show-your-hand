import type { ImageSourcePropType } from 'react-native'

export const cardAssets: Record<string, ImageSourcePropType> = {
  '/cards/back.png': require('../../public/cards/back.png'),
  '/cards/blank.png': require('../../public/cards/blank.png'),
  '/cards/show-your-hand.png': require('../../public/cards/show-your-hand.png'),
  '/cards/drop-color.png': require('../../public/cards/drop-color.png'),
  '/cards/skip.png': require('../../public/cards/skip.png'),
  '/cards/shuffle.png': require('../../public/cards/shuffle.png'),
  '/cards/orange-1.png': require('../../public/cards/orange-1.png'),
  '/cards/orange-2.png': require('../../public/cards/orange-2.png'),
  '/cards/orange-3.png': require('../../public/cards/orange-3.png'),
  '/cards/orange-4.png': require('../../public/cards/orange-4.png'),
  '/cards/orange-5.png': require('../../public/cards/orange-5.png'),
  '/cards/blue-1.png': require('../../public/cards/blue-1.png'),
  '/cards/blue-2.png': require('../../public/cards/blue-2.png'),
  '/cards/blue-3.png': require('../../public/cards/blue-3.png'),
  '/cards/blue-4.png': require('../../public/cards/blue-4.png'),
  '/cards/blue-5.png': require('../../public/cards/blue-5.png'),
  '/cards/green-1.png': require('../../public/cards/green-1.png'),
  '/cards/green-2.png': require('../../public/cards/green-2.png'),
  '/cards/green-3.png': require('../../public/cards/green-3.png'),
  '/cards/green-4.png': require('../../public/cards/green-4.png'),
  '/cards/green-5.png': require('../../public/cards/green-5.png'),
  '/cards/purple-1.png': require('../../public/cards/purple-1.png'),
  '/cards/purple-2.png': require('../../public/cards/purple-2.png'),
  '/cards/purple-3.png': require('../../public/cards/purple-3.png'),
  '/cards/purple-4.png': require('../../public/cards/purple-4.png'),
  '/cards/purple-5.png': require('../../public/cards/purple-5.png'),
}

export function sourceForArt(art: string): ImageSourcePropType {
  return cardAssets[art] ?? cardAssets['/cards/back.png']
}
