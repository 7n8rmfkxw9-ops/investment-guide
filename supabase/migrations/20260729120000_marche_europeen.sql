-- Ouverture aux societes europeennes, en commencant par la Belgique.
--
-- Il n'existe pas d'equivalent europeen du 13F (aucune obligation de publier
-- l'integralite d'un portefeuille chaque trimestre). En revanche, le
-- reglement europeen sur les abus de marche (MAR, article 19) impose aux
-- dirigeants de declarer leurs operations, et chaque regulateur national les
-- publie. Pour la Belgique, c'est la FSMA — l'equivalent de la SEC.

-- Nouveaux signaux : operations d'inities declarees au titre du reglement MAR.
alter type signal_type add value if not exists 'mar_buy';
alter type signal_type add value if not exists 'mar_sell';
