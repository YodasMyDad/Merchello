namespace Merchello.Core.Shared.Extensions;

public static class EnumerableExtensions
{
    /// <summary>
    ///     Filters a sequence of values to ignore those which are null.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="coll">The coll.</param>
    /// <returns></returns>
    /// <remarks></remarks>
    public static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> coll)
        where T : class
        =>
            coll.Where(x => x != null)!;

    public static void RemoveWhere<T>(this List<T> list, Func<T, bool> predicate)
    {
        var itemsToRemove = list.Where(predicate).ToList();

        foreach(var item in itemsToRemove)
        {
            list.Remove(item);
        }
    }

    /// <summary>
    /// An enumerable representing the cartesian product of the sequences
    /// </summary>
    /// <typeparam name="T">The type of the value</typeparam>
    /// <param name="sequences">The collections used in the cartesian product</param>
    /// <returns>The cartesian product of the sequences</returns>
    /// <seealso cref="http://stackoverflow.com/questions/3093622/generating-all-possible-combinations"/>
    public static IEnumerable<IEnumerable<T>> CartesianObjects<T>(this IEnumerable<IEnumerable<T>> sequences)
    {
        IEnumerable<IEnumerable<T>> emptyProduct = new[] { Enumerable.Empty<T>() };
        return sequences.Aggregate(
            emptyProduct,
            (accumulator, sequence) =>
                from accseq in accumulator
                from item in sequence
                select accseq.Concat<T>(new[]
                {
                    item
                }));
    }

    /// <summary>
    /// Returns the symmetric difference between two sequences (items in either sequence but not in both)
    /// </summary>
    /// <typeparam name="T">The type of elements</typeparam>
    /// <param name="startingList">The first sequence</param>
    /// <param name="otherList">The second sequence</param>
    /// <returns>Elements that exist in either sequence but not in both</returns>
    public static IEnumerable<T> Differences<T>(this IEnumerable<T> startingList, IEnumerable<T> otherList)
    {
        var startingArray = startingList as T[] ?? startingList.ToArray();
        var otherArray = otherList as T[] ?? otherList.ToArray();

        var inStartingButNotInOther = startingArray.Except(otherArray);
        var inOtherButNotInStarting = otherArray.Except(startingArray);
        return inStartingButNotInOther.Concat(inOtherButNotInStarting);
    }

    /// <summary>
    /// Splits an array into several smaller arrays.
    /// </summary>
    /// <typeparam name="T">The type of the array.</typeparam>
    /// <param name="array">The array to split.</param>
    /// <param name="size">The size of the smaller arrays.</param>
    /// <returns>An array containing smaller arrays.</returns>
    public static IEnumerable<IEnumerable<T>> Split<T>(this T[] array, int size)
    {
        for (var i = 0; i < (float)array.Length / size; i++)
        {
            yield return array.Skip(i * size).Take(size);
        }
    }

    /// <summary>
    /// Finds all possible combinations of the items in the collection.
    /// </summary>
    /// <param name="collection">
    /// The collection.
    /// </param>
    /// <typeparam name="T">
    /// The type of value in the collection
    /// </typeparam>
    /// <returns>
    /// A statics in the form of a collection of Tuples representing the level (number of items in the match collection) of the matches and a list of
    /// matches that constitute the matching group.
    ///
    /// e.g.  For  V1, V2, T3
    /// we expect
    ///
    /// [
    ///    [1, [V1]], [1, [V2]], [1, [V3]],
    ///    [2, [V1, V2]], [2, [V1, V3]], [2, [V2, V3]]
    ///    [3, [V1, V2, V3]]
    /// ]
    ///
    /// </returns>
    internal static IEnumerable<Tuple<int, IEnumerable<T>>> AllCombinationsOf<T>(this IEnumerable<T> collection)
    {
        var combos = new List<Tuple<int, IEnumerable<T>>>();

        var collectionArray = collection as T[] ?? collection.ToArray();
        var count = Math.Pow(2, collectionArray.Count());
        for (var i = 1; i <= count - 1; i++)
        {
            var str = Convert.ToString(i, 2).PadLeft(collectionArray.Count(), '0');
            var level = str.ToArray().Where(x => x != '0').Sum(x => Int32.Parse(x.ToString()));

            var group = new List<T>();

            for (var j = 0; j < str.Length; j++)
            {
                if (str[j] == '1')
                {
                    @group.Add(collectionArray[j]);
                }
            }

            combos.Add(new Tuple<int, IEnumerable<T>>(level, @group));
        }

        return combos;
    }
}
