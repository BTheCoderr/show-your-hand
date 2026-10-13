import type { ImageSourcePropType } from 'react-native'

export const cardAssets: Record<string, ImageSourcePropType> = {
  '/cards/back.png': require('../../public/cards/v2/back.jpeg'),
  '/cards/blank.png': require('../../public/cards/v2/blank.jpeg'),
  '/cards/show-your-hand.png': require('../../public/cards/v2/show-your-hand.jpeg'),
  '/cards/drop-color.png': require('../../public/cards/v2/drop-color.jpeg'),
  '/cards/skip.png': require('../../public/cards/v2/skip.jpeg'),
  '/cards/shuffle.png': require('../../public/cards/shuffle.png'),
  '/cards/orange-1.png': require('../../public/cards/v2/orange-1.jpeg'),
  '/cards/orange-2.png': require('../../public/cards/v2/orange-2.jpeg'),
  '/cards/orange-3.png': require('../../public/cards/v2/orange-3.jpeg'),
  '/cards/orange-4.png': require('../../public/cards/v2/orange-4.jpeg'),
  '/cards/orange-5.png': require('../../public/cards/v2/orange-5.jpeg'),
  '/cards/blue-1.png': require('../../public/cards/blue-1.png'),
  '/cards/blue-2.png': require('../../public/cards/blue-2.png'),
  '/cards/blue-3.png': require('../../public/cards/blue-3.png'),
  '/cards/blue-4.png': require('../../public/cards/blue-4.png'),
  '/cards/blue-5.png': require('../../public/cards/blue-5.png'),
  '/cards/green-1.png': require('../../public/cards/v2/green-1.jpeg'),
  '/cards/green-2.png': require('../../public/cards/v2/green-2.jpeg'),
  '/cards/green-3.png': require('../../public/cards/v2/green-3.jpeg'),
  '/cards/green-4.png': require('../../public/cards/v2/green-4.jpeg'),
  '/cards/green-5.png': require('../../public/cards/v2/green-5.jpeg'),
  '/cards/purple-1.png': require('../../public/cards/v2/purple-1.jpeg'),
  '/cards/purple-2.png': require('../../public/cards/v2/purple-2.jpeg'),
  '/cards/purple-3.png': require('../../public/cards/v2/purple-3.jpeg'),
  '/cards/purple-4.png': require('../../public/cards/v2/purple-4.jpeg'),
  '/cards/purple-5.png': require('../../public/cards/v2/purple-5.jpeg'),
}

export function sourceForArt(art: string): ImageSourcePropType {
  return cardAssets[art] ?? cardAssets['/cards/back.png']
}
