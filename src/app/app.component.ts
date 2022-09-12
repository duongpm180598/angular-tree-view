import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl, NestedTreeControl } from '@angular/cdk/tree';
import { Component, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';
import { AddCategoryPopupComponent } from './add-category-popup/add-category-popup.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'treeview';
  checkedCategory: any;
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<CategoryFlatNode, CategoryItemFlatNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<CategoryItemFlatNode, CategoryFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: CategoryFlatNode | null = null;

  /** The new item's name */
  newItemName = '';

  treeControl: FlatTreeControl<CategoryFlatNode>;

  treeFlattener: MatTreeFlattener<CategoryItemFlatNode, CategoryFlatNode>;

  // dataSource: MatTreeFlatDataSource<CategoryItemFlatNode, CategoryFlatNode>;
  dataSource: any;

  /** The selection for checklist */
  categorySelection = new SelectionModel<CategoryFlatNode>(true /* multiple */);

  constructor(private database: ChecklistDatabase, private dialog: MatDialog) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<CategoryFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    database.dataChange.subscribe((data) => {
      this.dataSource.data = data;
    });
  }

  getLevel = (node: CategoryFlatNode) => node.level;

  isExpandable = (node: CategoryFlatNode) => node.expandable;

  getChildren = (node: CategoryItemFlatNode): CategoryItemFlatNode[] =>
    node.children;

  hasChild = (_: number, _nodeData: CategoryFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: CategoryFlatNode) =>
    _nodeData.category_name === '';

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: CategoryItemFlatNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.category_name === node.category_name
        ? existingNode
        : new CategoryFlatNode();
    flatNode.category_id = node.category_id;
    flatNode.parent_category_id = node.parent_category_id;
    flatNode.isHidden = node.isHidden;
    flatNode.category_name = node.category_name;
    flatNode.level = level;
    flatNode.expandable = !!node.children;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  onShowHidden(event: any) {}

  /** Whether all the descendants of the node are selected */
  descendantsAllSelected(node: CategoryFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    return descendants.every((child) =>
      this.categorySelection.isSelected(child)
    );
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: CategoryFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.categorySelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  categorySelectionToggle(node: CategoryFlatNode): void {
    this.categorySelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.categorySelection.isSelected(node)
      ? this.categorySelection.select(...descendants)
      : this.categorySelection.deselect(...descendants);
    this.checkedCategory = this.categorySelection.isSelected(node) ? node : {};
  }

  /** Select the category so we can insert the new item. */
  addNewItem(node: CategoryFlatNode) {
    console.log(node)
    const parentNode = this.flatNodeMap.get(node);
    this.database.insertItem(parentNode!, '');
    this.treeControl.expand(node);
  }

  /** Save the node to database */
  saveNode(node: CategoryFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateItem(nestedNode!, itemValue);
  }

  onAddCategory(node: CategoryFlatNode) {
    const dialogRef = this.dialog.open(AddCategoryPopupComponent, {
      data: { category: this.checkedCategory },
    });
    dialogRef.afterClosed().subscribe((category_name) => {
      console.log(category_name);
    });
    // console.log('this.checkedCategory', this.checkedCategory);
    // const nest = (items: any, category_id = 0, link = 'parent_category_id') =>
    //   items
    //     .filter((item: any) => item[link] === category_id)
    //     .map((item: any) => ({
    //       ...items,
    //       children: nest(items, item.category_id),
    //     }));
    // console.log(nest(TREE_DATA_2));
  }

  onAddSubCategory(node: CategoryFlatNode) {
    const dialogRef = this.dialog.open(AddCategoryPopupComponent, {
      data: { node },
    });
    dialogRef.afterClosed().subscribe((category_name) => {
      // this.addNewItem(node)
      this.saveNode(node, category_name)
    });
  }

  onHideCategory(node: CategoryFlatNode) {}

  onEditCategory(node: CategoryFlatNode) {}
}

/**
 * Node for to-do item
 */
export class CategoryItemFlatNode {
  children!: CategoryItemFlatNode[];
  category_id!: number;
  category_name!: string;
  parent_category_id!: number;
  level!: number;
  expandable!: boolean;
  isHidden!: boolean;
}

/** Flat to-do item node with expandable and level information */
export class CategoryFlatNode {
  category_id!: number;
  category_name!: string;
  parent_category_id!: number;
  level!: number;
  expandable!: boolean;
  isHidden!: boolean;
  children!: [];
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = [
  {
    category_id: 1,
    parent_category_id: 0,
    category_name: 'Staffs',
    ishidden: false,
    level: null,
    expandable: false,
    children: [
      {
        category_id: 2,
        parent_category_id: 1,
        category_name: 'Teachers',
        ishidden: false,
        level: null,
        expandable: false,
        children: [],
      },
      {
        category_id: 3,
        parent_category_id: 1,
        category_name: 'Security',
        ishidden: false,
        level: null,
        expandable: false,
        children: [],
      },
    ],
  },
];

let TREE_DATA_2: any = [
  {
    category_id: 1,
    parent_category_id: 0,
    category_name: 'Staffs',
    ishidden: false,
  },
  {
    category_id: 2,
    parent_category_id: 1,
    category_name: 'Teachers',
    ishidden: false,
  },
  {
    category_id: 3,
    parent_category_id: 1,
    category_name: 'Security',
    ishidden: false,
  },
];

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<any[]>([]);
  treeData!: any[];

  get data(): CategoryItemFlatNode[] {
    return this.dataChange.value;
  }

  constructor() {
    this.initialize();
  }

  initialize() {
    this.treeData = TREE_DATA;
    // Build the tree nodes from Json object. The result is a list of `CategoryItemFlatNode` with nested
    //     file node as children.
    const data = TREE_DATA;

    // Notify the change.
    this.dataChange.next(data);
  }

  insertRoot() {
    this.dataChange.next(this.data);
  }

  /** Add an item to category list */
  insertItem(parent: CategoryItemFlatNode, name: string) {
    if (parent.children) {
      parent.children.push({ category_name: name } as CategoryItemFlatNode);
      this.dataChange.next(this.data);
    }
  }

  updateItem(node: CategoryItemFlatNode, name: string) {
    node.category_name = name;
    this.dataChange.next(this.data);
  }
}
